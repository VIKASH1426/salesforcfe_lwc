import { LightningElement, api, track, wire } from 'lwc';
import { getRecord, updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import EMPLOYEE_OBJECT from '@salesforce/schema/Employee__c';
import EXTRA_NOTES_FIELD from '@salesforce/schema/Employee__c.Extra_Notes__c';
import ONBOARDING_STATUS_FIELD from '@salesforce/schema/Employee__c.Onboarding_Status__c';

export default class ExtraNotesHandler extends LightningElement {
    @api recordId; // Employee record ID
    @track extraNotes = '';
    @track isEditingEnabled = false;
    @track message = '';
    @track messageClass = '';
    @track isSaving = false;
    @track canEdit = true;

    // Wire to get Employee record
    @wire(getRecord, { 
        recordId: '$recordId', 
        fields: [EXTRA_NOTES_FIELD, ONBOARDING_STATUS_FIELD] 
    })
    wiredEmployee({ error, data }) {
        if (data) {
            this.extraNotes = data.fields.Extra_Notes__c.value || '';
            // Only allow editing if status is "In Progress"
            const status = data.fields.Onboarding_Status__c.value;
            this.canEdit = status === 'In Progress';
            
            if (!this.canEdit) {
                this.isEditingEnabled = false;
                this.showMessage('Editing only allowed when Onboarding Status is "In Progress"', 'warning');
            }
        } else if (error) {
            this.showMessage('Error loading employee data: ' + error.body.message, 'error');
        }
    }

    // Computed property for read-only state
    get isReadOnly() {
        return !this.isEditingEnabled || !this.canEdit;
    }

    // Handle edit toggle
    handleEditToggle(event) {
        if (!this.canEdit) {
            this.showMessage('Editing only allowed when Onboarding Status is "In Progress"', 'warning');
            event.target.checked = false;
            return;
        }
        this.isEditingEnabled = event.target.checked;
        this.clearMessage();
    }

    // Handle notes change
    handleNotesChange(event) {
        this.extraNotes = event.target.value;
    }

    // Public API method to update field value
    @api
    updateExtraNotes(newValue) {
        this.extraNotes = newValue;
        return this.saveNotes();
    }

    // Handle save button click
    handleSave() {
        this.saveNotes();
    }

    // Save notes to Salesforce
    async saveNotes() {
        if (!this.recordId) {
            this.showMessage('No record ID provided', 'error');
            return { success: false, error: 'No record ID' };
        }

        this.isSaving = true;
        try {
            const fields = {};
            fields.Id = this.recordId;
            fields[EXTRA_NOTES_FIELD.fieldApiName] = this.extraNotes;

            await updateRecord({ fields });
            
            this.showMessage('Notes saved successfully!', 'success');
            this.isEditingEnabled = false;
            return { success: true };
        } catch (error) {
            this.showMessage('Error saving notes: ' + error.body.message, 'error');
            return { success: false, error: error.body.message };
        } finally {
            this.isSaving = false;
        }
    }

    // Show message helper
    showMessage(message, variant) {
        this.message = message;
        this.messageClass = `slds-text-color_${variant}`;
        
        // Clear message after 5 seconds
        setTimeout(() => {
            this.clearMessage();
        }, 5000);

        // Also show toast notification
        this.dispatchEvent(new ShowToastEvent({
            title: variant === 'success' ? 'Success' : variant === 'error' ? 'Error' : 'Info',
            message,
            variant
        }));
    }

    // Clear message helper
    clearMessage() {
        this.message = '';
        this.messageClass = '';
    }
}