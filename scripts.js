class Stepper {
    constructor(stepSelector) {
        this.steps = Array.from(document.querySelectorAll(stepSelector));
        this.activeStep = this.steps.find(step => step.classList.contains('active'));
        this.observeStepContentChanges(); 

        this.stepHandlers = {}; // Store step instances
        this.updateStepNumbers();
        this.customStepCode(this.steps.indexOf(this.activeStep))
        
    }

    adjustMaxHeight(step) {
        if (!step) return;
        const stepContent = step.querySelector('.step-content');
        if (stepContent) {
            stepContent.style.maxHeight = stepContent.scrollHeight + 'px';
        }
    }

    setActive(step) {
        if (!step) return;

        if (this.activeStep) {
            
            this.activeStep.classList.remove('active');
            const stepContent = this.activeStep.querySelector('.step-content');
            if (stepContent) {
                stepContent.style.maxHeight = null;
            }
        }

        step.classList.add('active');
        this.activeStep = step;

        this.updateStepNumbers();
        this.customStepCode(this.steps.indexOf(this.activeStep))

        //this.adjustMaxHeight(step); //hiding this fixed the accordion issue, unknown other effects/imapcts though
    }

    updateStepNumbers() {
        this.steps.forEach((step, index) => {
            let stepNumberElement = step.querySelector('.step-number');
            if (!stepNumberElement) return;
    
            const isActive = step === this.activeStep;
            const isCompleted = index < this.steps.indexOf(this.activeStep);
    
            this.styleStepNumber(stepNumberElement, index, isActive, isCompleted);
        });
    }
    
    
    styleStepNumber(element, index, isActive, isCompleted) {
        element.style.backgroundColor = isActive || isCompleted ? "#26374A" : "#6F6F6F";
        element.style.color = "#FFFFFF";
    
        if (index === 0 && !isCompleted) {
            // First step gets the 'info' icon
            element.innerHTML = `<strong>i</strong>`;
        } else {
            // Other steps display their number
            element.innerHTML = isCompleted ? `<span class="material-icons">check</span>` : `${index}`;
        }
    }
    
    

    observeStepContentChanges() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === "childList") {
                    this.adjustMaxHeight(this.activeStep); // ✅ Auto-adjust height when new elements are added
                }
            });
        });

        this.steps.forEach(step => {
            const stepContent = step.querySelector('.step-content');
            if (stepContent) {
                observer.observe(stepContent, { childList: true, subtree: true });
            }
        });
    }

    navigateStep(direction) {
        const currentIndex = this.steps.indexOf(this.activeStep);
        const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

        if (targetIndex >= 0 && targetIndex < this.steps.length) {
           this.storeData(currentIndex);
            this.setActive(this.steps[targetIndex]);
        }
    }

    storeData(stepNum) {
        const stepForm = document.querySelector(`#step-${stepNum}-form`);
        let dataObj = {};
        const checkArr = [];
        if (stepForm) {
            stepForm.querySelectorAll("input, select, textarea").forEach(input => {
               
                if (input.type === "radio") {
                    if (input.checked) {
                        dataObj[input.name] = input.value;
                    }
                } 
                else if (input.type === "checkbox") {
                   
                    if (input.checked) {
                        checkArr.push(input.value);
                        dataObj[input.name] = checkArr;
                    }
                }
                else {
                    dataObj[input.name] = input.value;
                }
            });
        }
        if (stepNum === 3) {
            const handler = this.stepHandlers[stepNum];
            if (handler instanceof Step3Handler && handler.userLevel === 3 && handler.legalReps.length === 1) {
                handler.updateSingleLevel3Rep();
            }
        }
        if (stepNum === 4) {
            let step4Handler = this.stepHandlers[stepNum]; 
            if (step4Handler && step4Handler.documentsTable) {
                dataObj["uploadedDocuments"] = step4Handler.documentsTable.rows;
            }
        }
    
        DataManager.saveData(`stepData_${stepNum}`, dataObj);
    }
    

    loadStoredData() {
        this.steps.forEach((step, index) => {
            let savedData = DataManager.getData(`stepData_${index}`);
            if (!savedData) return;

            Object.keys(savedData).forEach(key => {
                let input = step.querySelector(`[name="${key}"]`);
                if (input) {
                    if (input.type === "radio" || input.type === "checkbox") {
                        if (input.value === savedData[key]) {
                            input.checked = true;
                        }
                    } else {
                        input.value = savedData[key];
                    }
                }
            });
        });
    }

    customStepCode(stepNum){
        if (!this.stepHandlers[stepNum]) {
            switch (stepNum) {
                case 1:
                    this.stepHandlers[stepNum] = new Step1Handler(); 
                    break;
                case 2:
                    this.stepHandlers[stepNum] = new Step2Handler(); 
                    break;
                case 3:
                    this.stepHandlers[stepNum] = new Step3Handler(); 
                    break;
                case 4:
                    this.stepHandlers[stepNum] = new Step4Handler();
                    break;
                case 5:
                    this.stepHandlers[stepNum] = new Step5Handler(this);
                break;
            }
        }
    }
}
class Step1Handler {
    constructor(){
        this.q1Lightbox = new FormLightbox(document.getElementById("s1q1-lightbox"));
    }
}
class Step2Handler {
    constructor(){
        this.deceasedtpPanelContainer = document.getElementById("deceasedinfo-panel-container");
        this.deceasedIndivid = DataManager.getData("deceasedInfo") || null;

        this.populateDeceasedPanel();
        
    }
    populateDeceasedPanel(){

        var shownData = { 
            name: this.deceasedIndivid.name, 
            sin: this.deceasedIndivid.sin,
            dateOfDeath: this.deceasedIndivid.dateOfDeath
        };

        new PanelObj({
            container: this.deceasedtpPanelContainer,
            title: "Deceased individual’s information on file",
            data: shownData,
            editButton: false, 
            editIndex: null,
            reviewPanel: false,
            labels: ["Name of deceased", "Social insurance number (SIN)", "Date of death"]
        })
    
    }
}
class Step3Handler {
    constructor() {
        this.userLevel = parseInt(DataManager.getData("userLevel")) || 2;
        this.legalReps = DataManager.getData("legalReps") || [];
        this.deceasedAddress = DataManager.getData("deceasedInfo").address;


        this.repPanelContainer = document.getElementById("legalrep-panel-container");
        this.addRepButton = document.querySelector('[data-togglelb="addlegalrep-lightbox"]');
        this.lightbox = new FormLightbox(document.getElementById("addlegalrep-lightbox"));

        this.noRepsAlert = document.getElementById("alert-norep");
        this.mailingAlert = document.getElementById("alert-mailing");
        this.repsQuestion = document.getElementById("s3q1-fieldset");
        this.repsTableFieldset = document.getElementById("s3q2-fieldset");
        this.legalRepInfoFieldset = document.getElementById("legalrepinfo-fieldset");
        this.legalRepAddressLBDiv = document.getElementById("s3-level3-address");
        this.legalRepAddressLBSpan = document.getElementById("s3-deceased-address");

        this.repsTable = new TableObj("tb-add-rep");
        this.firstRepAdded = false;

        this.renderInitialView();
        this.setupListeners();
    }
    renderInitialView() {
        
        this.repPanelContainer.innerHTML = "";

        // If userLevel 2 (no preloaded legal rep)
        if (this.userLevel === 2) {
            this.repsQuestion.classList.add("hidden");
            this.repsTableFieldset.classList.remove("hidden");

            const label = this.repsTableFieldset.querySelector('label');
            label.childNodes[1].nodeValue = "Provide information for the legal representative(s) of the deceased individual.";
            
            this.mailingAlert.classList.add("hidden");
            this.legalRepInfoFieldset.classList.add("hidden");
            this.legalRepAddressLBDiv.classList.remove("hidden");
            this.legalRepAddressLBSpan.innerHTML = this.deceasedAddress;
        }

        // If userLevel 3 and rep exists
        if (this.userLevel === 3) {
           
            this.firstRepAdded = true;
            this.renderPanel(this.legalReps[0], "Legal representative");
            this.repsQuestion.classList.remove("hidden");
            this.noRepsAlert.classList.add("hidden");
           
        }
    
    }
    setupListeners() {
        document.addEventListener("lightboxSubmitted", (event) => {
            if (event.detail.lightboxId === "addlegalrep-lightbox") {
                this.handleFormSubmit(event.detail.formData);
            }
        });

        document.addEventListener("editRowEvent", (e) => {
            if (e.detail.tableID === "tb-add-rep") {
                this.lightbox.setEditIndex(e.detail.index);
                this.lightbox.populateForm(e.detail.rowData);
                this.lightbox.openLightbox();

                if (this.userLevel === 2 && parseInt(e.detail.index) === 0) {
                    this.legalRepAddressLBDiv.classList.remove("hidden");
                } else {
                    this.legalRepAddressLBDiv.classList.add("hidden");
                }
            
            }
        });

        document.addEventListener("rowDeleted", () => {
            DataManager.saveData("legalReps", this.repsTable.rows);

            if (this.userLevel === 2 && this.repsTable.rows.length === 0) {
                this.legalRepAddressLBDiv.classList.remove("hidden");
            }
        });

    }
    

    handleFormSubmit(formData) {
        const editIndex = this.lightbox.getEditIndex();
        const newRep = this.getNewRepFromForm(formData);
    
        this.updateRepsTable(newRep, editIndex);
        this.handlePostRepAddUI();
      
    }
    getNewRepFromForm(formData) {
        const fullName = `${formData["s3-repfname"]} ${formData["s3-replname"]}`.trim();
        return {
            name: fullName,
            role: formData["s3-reprole"],
            phone: formData["s3-reptel"]
        };
    }
    updateSingleLevel3Rep() {
        const phoneInput = document.querySelector('#s3-lvl3-reptel');
        const roleSelect = document.querySelector('#s3-lvl3-reprole');
    
        if (!phoneInput || !roleSelect) return;
    
        const phone = phoneInput.value.trim();
        const role = roleSelect.value;
        
    
        this.legalReps[0].phone = phone || null;
        this.legalReps[0].role = role || null;
    
        DataManager.saveData("legalReps", this.legalReps);
    }

    updateRepsTable(newRep, editIndex) {
        if (editIndex !== null && editIndex !== undefined && editIndex !== "") {
            this.legalReps[editIndex] = newRep;
            this.lightbox.clearEditIndex();
            this.repsTable.rows[editIndex] = { name: newRep.name, role: newRep.role };
            this.repsTable.refreshTable();
        } else {
            this.legalReps.push(newRep);
            this.repsTable.addRow({ name: newRep.name, role: newRep.role });
        }
        DataManager.saveData("legalReps", this.legalReps);
    }
    handlePostRepAddUI() {
        if (this.userLevel === 2 && this.legalReps.length > 0) {
            this.noRepsAlert.classList.add("hidden");
            this.legalRepAddressLBDiv.classList.add("hidden");
        }
    }

    renderPanel(data, title) {
        new PanelObj({
            container: this.repPanelContainer,
            title,
            data,
            editButton: false,
            deleteButton: false,
            labels: ["Name", "Mailing address"]
        });
    }
   
}
class Step4Handler {
    constructor() {
        //this.tempData = null; // Temporary storage for lightbox data
        this.documentsTable = new TableObj("tb-upload-doc");
        this.uploadDocLightbox = new FormLightbox(document.getElementById("uploaddoc-lightbox"));

        this.browseFileButton = document.getElementById("s4-browsebtn");
        this.browseWindow = document.getElementById("s4-browsewind");
        this.fileList = document.querySelectorAll('.file-item');

        this.fileNameDisplay = document.getElementById("s4-filename-display");
        this.hiddenFileInput = document.getElementById("s4-filename");
        this.hiddenFileSize = document.getElementById("s4-size");

        this.uploadedDocsQ = document.querySelectorAll('input[name="s4q1"]');
        this.tableLabelAsterisk = document.getElementById("s4q4-fieldset").querySelector('legend span');
        

        if(!this.browseFileButton) return; 

        this.uploadedDocsQ.forEach(radio => {

            radio.addEventListener('change', () => {
              if (radio.value == 'Yes') {
                this.tableLabelAsterisk.classList.add('hidden');
              } else {
                this.tableLabelAsterisk.classList.remove('hidden');
              }
            });
          });
       

        this.browseFileButton.addEventListener("click", () => {
            this.browseWindow.classList.remove('hidden');
            //this.selectFile();
        });
       this.fileList.forEach((file) => {
            file.addEventListener('click', () =>{
                this.selectFile(file);
                this.browseWindow.classList.add('hidden');
            });
        }); 

        document.addEventListener("lightboxSubmitted", (event) => {
            if (event.detail.lightboxId === "uploaddoc-lightbox") {
                this.handleFormSubmit(event.detail.formData);
            }
        });
        // Listen for edit events
        document.addEventListener("editRowEvent", (event) => {
            if (event.detail.tableID === "tb-upload-doc") {
                this.openEditLightbox(event.detail.index, event.detail.rowData);
            }
        });
        document.addEventListener("fileSizeUpdated", () => {
            this.calculateTotalFileSize();
        });
        document.addEventListener("rowDeleted", () => {
            this.calculateTotalFileSize();
        });
        

        this.calculateTotalFileSize();
    }
    selectFile(file){
        
        let fileName = file.childNodes[1].nodeValue.trim();
        this.fileNameDisplay.textContent = fileName;
        this.hiddenFileInput.value = fileName;
        const fakeSize = Math.floor(Math.random() * 450) + 50; // Generates 50-500 KB
        this.hiddenFileSize.value = fakeSize; // Store size as a number
        
    }

    openEditLightbox(index, rowData) {
       
        // Set the index of the row being edited
        this.uploadDocLightbox.setEditIndex(index);

        // Fill form with existing row data
        this.uploadDocLightbox.populateForm(rowData);
         // Manually update filename span
        if (rowData["s4-filename"]) {
            const filenameDisplay = document.getElementById("s4-filename-display");
        if (filenameDisplay) {
            filenameDisplay.textContent = rowData["s4-filename"];
        }
    }

        // Open the lightbox
        this.uploadDocLightbox.openLightbox();
    }

    handleFormSubmit(formData) {
        const editIndex = this.uploadDocLightbox.getEditIndex();
        

        let fileSize = parseInt(formData["s4-size"], 10) || 0;
        formData["s4-size"] = fileSize < 1024 ? `${fileSize} KB` : `${(fileSize / 1024).toFixed(2)} MB`;
    
        if (editIndex !== null && editIndex !== undefined && editIndex !== "") {
            this.documentsTable.rows[editIndex] = formData;
            this.uploadDocLightbox.clearEditIndex();
            this.documentsTable.refreshTable();
        } else {
            this.documentsTable.addRow(formData);
          
        }       
        document.dispatchEvent(new Event("fileSizeUpdated")); // Notify that the file size changed

    }

    calculateTotalFileSize() {
        let totalSize = this.documentsTable.rows.reduce((sum, row) => {
            let size = parseInt(row["s4-size"], 10) || 0; // Ensure size is numeric
            return sum + size;
        }, 0);
    
        let displaySize;
        if (totalSize < 1024) {
            displaySize = `${totalSize} KB`; // Keep KB format
        } else {
            displaySize = `${(totalSize / 1024).toFixed(2)} MB`; // Convert to MB with two decimals
        }
    
        document.getElementById("uploadedfiles-size").textContent = displaySize;
    }

    
}
class Step5Handler {
    constructor(stepper) {
        this.stepper = stepper;
        this.reviewContainer = document.getElementById("s5-review-container");
        this.submitBtn = document.getElementById("appsubmit-btn");
        this.populateReview();

        // Listen for navigation events
        document.addEventListener("navigateToStep", (event) => {
            this.stepper.setActive(this.stepper.steps[event.detail.index]);
        });

        this.submitBtn.addEventListener('click', () => {
            sessionStorage.setItem("navigatingToConfirmation", "true");
            // Store necessary data in sessionStorage to retrieve on confirmation page
            sessionStorage.setItem("deceasedInfo", JSON.stringify(DataManager.getData("deceasedInfo")));
            sessionStorage.setItem("legalRepresentative", JSON.stringify(DataManager.getData("legalRepresentative")));
            sessionStorage.setItem("racUserName", JSON.stringify(DataManager.getData("racUserName")));
        
            // Redirect to confirmation page
            window.location.href = "confirmation.html";
        });
    }

    populateReview() {
        this.reviewContainer.innerHTML = ""; // Clear previous content
    
        const steps = [
            { stepNum: 1, title: "Pre-screening", storageKey: "stepData_1" },
            { stepNum: 2, title: "Deceased individual’s information on file", storageKey: "stepData_2", labels: ["Name of deceased", "Social insurance number (SIN)", "Date of death"] },
            { stepNum: 3, title: "Representative's information", storageKey: "stepData_3" },
            { stepNum: 4, title: "Supporting documentation", storageKey: "stepData_4" },
        ];
        const deceasedInfo = DataManager.getData("deceasedInfo") || {};
        steps.forEach(({ stepNum, title, storageKey, labels }) => {
            let data = DataManager.getData(storageKey);
            if (!data) return; // Skip empty steps
    
           // Replace field names with question labels
           let formattedData = {};
           let subTableData = null; // Placeholder for subtable


           if (stepNum === 2) {
            delete deceasedInfo.address; // Remove address
            data = { ...deceasedInfo, ...data }; // Merge deceased info first, then stepData_2 to allow stepData_2 to override if needed
           }
           if (stepNum === 3) {
               let legalReps = DataManager.getData("legalReps") || [];

            
               legalReps.forEach((rep, index) => {
                formattedData["Legal representative name"] = rep.name || "N/A";
                formattedData["Mailing address"] = deceasedInfo.address;
                //only show address for first legal rep - no one else   
                
                formattedData["Role"] = rep.role || "N/A";
                formattedData["Telephone number"] = rep.phone || "N/A";

               });
           }
           else if (stepNum === 4 && data["uploadedDocuments"]) {
               subTableData = {
                   title: "Attachments",
                   headers: ["Name", "Description", "File Size"],
                   columns: ["s4-filename", "s4-desc", "s4-size"],
                   rows: data["uploadedDocuments"] || [] // Ensure it's always an array
               };
               delete data["uploadedDocuments"];
           }

           if (stepNum !== 3) { // Avoid overwriting Step 3 data
               Object.keys(data).forEach((key, index) => {
                if(stepNum === 2 && key === "address") return;

                   let questionLabel = labels && labels[index] ? labels[index] : this.getLabelForInput(key);
                   formattedData[questionLabel] = data[key]; // Assign label instead of raw key
               });
           }
   
           // Generate panel for each step
           new PanelObj({
               container: this.reviewContainer,
               title: title,
               data: formattedData, // Use the formatted data with proper labels
               editButton: true,
               editIndex: stepNum,
               reviewPanel: true,
               subTable: subTableData
           });
       });
       
        // Listen for edit button clicks
        document.addEventListener("editPanelEvent", (event) => {
            this.stepper.setActive(this.stepper.steps[event.detail.index]);
        });
    }



    getLabelForInput(name) {
        let label = "";

        // Try to find a corresponding label element
        const input = document.querySelector(`[name="${name}"]`);
        if (input) {
            const labelElement = document.querySelector(`label[for="${input.id}"]`);
            if (labelElement) {
                label = labelElement.textContent.trim();
            }
        }

        // If it's a radio group, get the fieldset legend
        const fieldset = document.querySelector(`fieldset [name="${name}"]`);
        if (fieldset) {
            const legend = fieldset.closest("fieldset").querySelector("legend");
            if (legend) {
                let cleaned = legend.innerHTML.replace(/<span[^>]*>.*?<\/span>/gi, '');
                label = cleaned.trim();
            }
        }
       
        // Remove asterisks and extra spaces
        return label.replace(/<span[^>]*>.*?<\/span>/gi, "").trim() || name; // Default to name if no label found
   
    }
    
}

class PanelObj {
    constructor({ container, title, data, editButton = false, editIndex = null, deleteButton = false, reviewPanel = false, labels = null, subTable = null }) {
        this.container = container; // The DOM element where the panel should be appended
        this.title = title;
        this.data = data;
        this.editButton = editButton;
        this.editIndex = editIndex;
        this.deleteButton = deleteButton;
        this.reviewPanel = reviewPanel;
        this.labels = labels; // Store optional labels
        this.subTable = subTable;

        this.render();
    }

    render() {

        this.panelElement = document.createElement("div");
        this.panelElement.classList.add("panel");

        let editButtonHTML = this.editButton ? 
            `<button type="button" class="btn-tertiary edit-btn" data-index="${this.editIndex}"><span class="material-icons">edit</span>Edit</button>` : "";

        let deleteButtonHTML = this.deleteButton ? 
        `<button type="button" class="btn-tertiary delete-btn" data-index="${this.editIndex}"><span class="material-icons">delete</span>Delete</button>` : "";
        // Generate table rows for main data
        let tableRows = Object.entries(this.data)
            .map(([key, value], index) => {
                if(value) {
                    let label = this.labels && this.labels[index] ? this.labels[index] : this.formatKey(key);
                    return `<tr><td class="label">${label}</td><td>${value}</td></tr>`;
                }
               
            })
            .join("");

        let subTableHTML = "";

        // Generate sub-table dynamically if data is provided
        if (this.subTable && this.subTable.rows && this.subTable.rows.length > 0) {
            subTableHTML = `
                <h5>${this.subTable.title || "Subtable"}</h5>
                <table class="review-table" cellpadding="0" cellspacing="0">
                    <thead>
                        <tr>
                            ${this.subTable.headers.map(header => `<th>${header}</th>`).join("")}
                        </tr>
                    </thead>
                    <tbody>
                        ${this.subTable.rows.map(row => `
                            <tr>
                                ${this.subTable.columns.map(column => `<td>${row[column] || "N/A"}</td>`).join("")}
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            `;
        }

        this.panelElement.innerHTML = `
            <div class="heading-row">
                <h5>${this.title}</h5>
                <div>
                ${editButtonHTML}
                ${deleteButtonHTML}
                </div>
                
            </div>
            <table class="panel-data">
                ${tableRows}
            </table>
            <div>

            ${subTableHTML} <!-- Dynamically insert sub-table if applicable -->
                        </div>

        `;

        this.container.appendChild(this.panelElement);

        const editButton = this.panelElement.querySelector(".edit-btn");

        if (editButton) {
            editButton.addEventListener("click", () => this.emitEditEvent());
        }
        const deleteButton = this.panelElement.querySelector(".delete-btn");

        if(deleteButton){
            deleteButton.addEventListener("click", () => this.emitDeleteEvent());
        }
    }

    formatKey(key) {
        return key
            .replace(/([A-Z]{2,})/g, match => match) // Keep acronyms like SIN intact
            .replace(/([a-z])([A-Z])/g, "$1 $2") // Insert spaces only between words
            .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
            .trim();
    }

    emitEditEvent() {
        if (this.reviewPanel) {
            document.dispatchEvent(new CustomEvent("navigateToStep", {
                detail: { index: this.editIndex }
            }));
        } else {
            document.dispatchEvent(new CustomEvent("editPanelEvent", {
                detail: { index: this.editIndex, panelTitle: this.title, panelData: this.data }
            }));
        }
    }
    emitDeleteEvent() {
        document.dispatchEvent(new CustomEvent("deletePanelEvent", {
            detail: { index: this.editIndex, panelTitle: this.title }
        }));
    }
}

class TableObj {
    constructor (tableID) {
        this.table = document.getElementById(tableID);
        this.tbody = this.table.querySelector("tbody");
        this.defaultText = this.tbody.dataset.placeholder;
        this.columnCount = this.table.querySelector("thead tr").children.length;
        this.rows = []; // Store data for easier access

       // Initialize the table with placeholder text if empty
       this.renderEmptyTable();
    }
    renderEmptyTable() {
        this.tbody.innerHTML = `<tr><td colspan="${this.columnCount + 1}" style="text-align:center;">${this.defaultText}</td></tr>`;
    }
    addRow(data, rowIndex = this.rows.length) {
        // If the table is displaying the default placeholder row, clear it
        if (this.tbody.querySelector("tr") && this.tbody.querySelector("tr").cells.length === 1) {
            this.tbody.innerHTML = "";
        }
        this.rows[rowIndex] = data; // Ensure correct index assignment

        // Create a new row
        const tr = document.createElement("tr");

        // Populate row with data
        Object.values(data).forEach((value) => {
            const td = document.createElement("td");
            td.textContent = value || "N/A"; // Handle empty fields
            tr.appendChild(td);
        });

        // Actions column (placeholder for buttons)
        const actionTd = document.createElement("td");
        actionTd.innerHTML = `
            <button type="button" class="btn-tertiary edit-btn" data-index="${rowIndex}"><span class="material-icons">edit</span>Edit</button>
            <button type="button" class="btn-tertiary delete-btn" data-index="${rowIndex}"><span class="material-icons">close</span>Delete</button>
        `;
        tr.appendChild(actionTd);

        // Append row to table
        this.tbody.appendChild(tr);

        // Attach event listeners
        actionTd.querySelector(".edit-btn").addEventListener("click", (event) => {
            this.emitEditEvent(event.target.closest(".edit-btn").dataset.index);
        });

        actionTd.querySelector(".delete-btn").addEventListener("click", (event) => {
            this.deleteRow(event.target.closest(".delete-btn").dataset.index);
        });

    }

    emitEditEvent(index) {
        index = parseInt(index);
        if (!this.rows[index]) return;

        // Dispatch an event so Step5Handler (or other handlers) can respond
        document.dispatchEvent(new CustomEvent("editRowEvent", {
            detail: {
                tableID: this.table.id,
                index: index,
                rowData: this.rows[index]
            }
        }));
    }
    deleteRow(index) {
        index = parseInt(index);
        this.rows.splice(index, 1);
        this.refreshTable();

        document.dispatchEvent(new CustomEvent("rowDeleted"));
    }

    refreshTable() {
        this.tbody.innerHTML = ""; // Clear the table
    
        if (this.rows.length === 0) {
            this.renderEmptyTable();
            return;
        }
    
        this.rows.forEach((rowData, index) => {
            this.addRow(rowData, index);
        });
    }
}

class DataManager {
    static saveData(key, value) {
        sessionStorage.setItem(key, JSON.stringify(value));
        document.dispatchEvent(new CustomEvent("dataUpdated", { detail: { key, data: value } }));
    }
    static appendToArray(key, newValue) {
        let existingData = DataManager.getData(key) || [];
        if (!Array.isArray(existingData)) existingData = []; // Ensure it's an array
        existingData.push(newValue);
        DataManager.saveData(key, existingData);
    }

    static getData(key) {
        let data = sessionStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    static clearData(key) {
        sessionStorage.removeItem(key);
    }
}

class FormLightbox {
    constructor(lightbox){
        this.lightbox = lightbox;
        this.form = this.lightbox.querySelector('form');
        this.openTrigger = document.querySelector(`[data-togglelb="${lightbox.id}"]`);
        this.submitButton = this.lightbox.querySelector('[data-submit]');
        this.editIndex = null;
       
        if(this.openTrigger){
            this.openTrigger.addEventListener('click', () => {
                this.openLightbox();
                this.clearFormData();
            });
            if(this.openTrigger.value){
                var buttonText = document.createTextNode(this.openTrigger.value);
                this.openTrigger.appendChild(buttonText)
            } 
        }
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        this.lightbox.querySelectorAll('[data-closebtn]').forEach(btn => {
            btn.addEventListener('click', () => this.closeLightbox());
        });

        if (this.submitButton) {
            this.submitButton.addEventListener('click', (event) => {
                event.preventDefault();
                this.sendFormData();
                
            });
        }
    }
    openLightbox() {
        this.lightbox.classList.add('open');
    }

    closeLightbox() {
        this.lightbox.classList.remove('open');
        this.clearEditIndex();
    }

    clearFormData() {
        if (!this.form) return;
        this.form.querySelectorAll("input, select, textarea").forEach(input => {
            if (input.type === "checkbox" || input.type === "radio") {
                input.checked = false;
            } else {
                input.value = "";
            }
        });
        let hiddenEls = this.form.querySelectorAll("[data-inithidden]");
        if(hiddenEls.length > 0){
            hiddenEls.forEach(el => {
                el.classList.add("hidden");
            })
        }
        // Reset spans with data-formelement
        this.form.querySelectorAll("[data-formelement]").forEach(span => {
        span.textContent = span.dataset.placeholder || "";
        });
    }

    populateForm(data) {
        if (!this.form) return;
        Object.keys(data).forEach((key) => {
            const input = this.form.querySelector(`[name="${key}"]`);
            if (input) input.value = data[key];
        });
    }

    sendFormData() {
        const formData = new FormData(this.form);
        let dataObj = {};
    
        formData.forEach((value, key) => {
            dataObj[key] = value;
        });
        
        document.dispatchEvent(new CustomEvent("lightboxSubmitted", {
            detail: {
                lightboxId: this.lightbox.id,
                formData: dataObj
            }
        }));
    
        this.closeLightbox();
    }
    
    setEditIndex(index) {
        this.editIndex = index;
    }

    getEditIndex() {
        return this.editIndex;
    }
    clearEditIndex() {
        this.editIndex = null;
    }
}

class ProgressiveDisclosure {
    constructor(stepperInstance = null) {
        this.stepper = stepperInstance; // Optionally pass the stepper instance
        this.initializeEventListeners();
        this.outConditions = [
            //step 1 selections that result in an "out"
            ["s1q1-op2"], 
            ["s1q2-op2"], 
            ["s1q4-op2"],
            ["s1q5-op2"], 
            ["s1q6-op2"]
        ];
        
    }

    initializeEventListeners() {
        // Attach change event to all elements with the `data-toggle` attribute
        document.querySelectorAll('[data-toggle], input[type="radio"], input[type="checkbox"]').forEach(input => {
            input.addEventListener('change', this.handleInputChange.bind(this));
            
        });

    }
    handleInputChange(event) {
        this.handleToggle(event); // Ensure Progressive Disclosure still works
        this.outCheck(); // Check if the user should be redirected
    }

    handleToggle(event) {
        const input = event.target;
        const toggleTargets = input.getAttribute('data-toggle');

        // Hide all sibling toggle targets in the same group
        this.hideOtherTargets(input);

        // If the current input has a data-toggle, handle its targets
        if (toggleTargets) {
            const targetIds = toggleTargets.split(',').map(id => id.trim());
            targetIds.forEach(targetId => {
                const targetElement = document.getElementById(targetId);
                if (!targetElement) {
                    console.error(`Element with ID '${targetId}' not found.`);
                    return;
                }

                if (input.checked) {
                    targetElement.classList.remove('hidden');
                }
            });
        }

        // Adjust stepper height if available
        if (this.stepper) {
            const currStep = this.stepper.activeStep;
            this.stepper.adjustMaxHeight(currStep);
        }
    }


    hideOtherTargets(input) {
    const groupName = input.name;

    if (groupName) {
        const groupInputs = document.querySelectorAll(`input[name="${groupName}"]`);

        groupInputs.forEach(groupInput => {
            const otherTargets = groupInput.getAttribute('data-toggle');

            if (otherTargets) {
                const targetIds = otherTargets.split(',').map(id => id.trim());

                targetIds.forEach(targetId => {
                    const targetElement = document.getElementById(targetId);
                    if (targetElement) {
                        this.hideWithSubfields(targetElement);
                    }
                });
            }
        });

        // ✅ NEW: Hide all subsequent fieldsets if the current input triggers an out
        const parentFieldset = input.closest("fieldset");
        if (parentFieldset && parentFieldset.classList.contains("hidden")) {
            let nextFieldset = parentFieldset.nextElementSibling;
            while (nextFieldset) {
                if (nextFieldset.tagName === "FIELDSET") {
                    this.hideWithSubfields(nextFieldset);
                }
                nextFieldset = nextFieldset.nextElementSibling;
            }
        }
    }
}


hideWithSubfields(element) {
    element.classList.add("hidden");

    // Clear all inputs inside the hidden element
    const inputs = element.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.type === 'radio' || input.type === 'checkbox') {
            input.checked = false;
        } else {
            input.value = '';
        }
    });

    // Recursively hide any nested fields inside this element
    const nestedToggles = element.querySelectorAll('[data-toggle]');
    nestedToggles.forEach(nestedToggle => {
        const nestedTargets = nestedToggle.getAttribute('data-toggle');
        if (nestedTargets) {
            nestedTargets.split(',').forEach(nestedTargetId => {
                const nestedTargetElement = document.getElementById(nestedTargetId.trim());
                if (nestedTargetElement) {
                    this.hideWithSubfields(nestedTargetElement);
                }
            });
        }
    });
}

    outCheck (){
        let selectedInputs = Array.from(document.querySelectorAll('input:checked')).map(input => input.id);
    
        let isOut = this.outConditions.some(conditionSet => conditionSet.every(id => selectedInputs.includes(id)));
    
        this.updateNavigationButtons(isOut);
    
    }
    
    updateNavigationButtons(isOut) {
        const activeStep = document.querySelector('.step.active'); // Get the current active step
        if (!activeStep) return;

        const nextBtn = activeStep.querySelector('.next-button');
        const backBtn = activeStep.querySelector('.back-button');
        const outBtn = activeStep.querySelector('.out-button');

        if (!outBtn) return; // If no next button is found, exit

        if (isOut) {
            nextBtn.classList.add("hidden");
            backBtn.classList.add("hidden");

            outBtn.classList.remove("hidden");
           
        } else {
            nextBtn.classList.remove("hidden");
            backBtn.classList.remove("hidden");

            outBtn.classList.add("hidden");
        }
    }
    
}

document.addEventListener('DOMContentLoaded', () => {

    let taskData = sessionStorage.getItem("selectedTask");

    if (!taskData) {
        // If user somehow lands here without choosing a task, redirect them back
        window.location.href = "chooser.html";
    } else {
        taskData = JSON.parse(taskData);
        console.log("Loaded Task Data:", taskData);

        // Store data for use in other scripts
        DataManager.saveData("deceasedInfo", taskData.deceasedInfo);
        DataManager.saveData("userLevel", taskData.userLevel);

        if (taskData.userLevel === 3 && taskData.deceasedInfo?.address) {
            DataManager.saveData("legalReps", [
                {
                    name: taskData.racUserName,
                    address: taskData.deceasedInfo.address,
                    role: null, // Default or populate as needed
                    phone: null
                }
            ]);
        }
        
        if (taskData.racUserName) {
            DataManager.saveData("racUserName", taskData.racUserName);
            document.getElementById("task-rep-name").textContent = taskData.racUserName;   
        }
        else {
            document.getElementById("task-rep-name").textContent = "REPRESENTATIVE NAME";
        }

        if (taskData.deceasedInfo && taskData.deceasedInfo.name) {
            document.getElementById("task-accountuser-name").textContent = taskData.deceasedInfo.name;
        }
    }

    // Initialize Stepper
    const stepper = new Stepper('.step');

    // Initialize ProgressiveDisclosure and pass the stepper instance
    new ProgressiveDisclosure(stepper);

    // Load the last step from session storage
    const savedStepId = sessionStorage.getItem('currentStep');
    if (savedStepId) {
        stepper.jumpStep(savedStepId);
    }

    // Add event listeners to all next buttons
    document.querySelector('.stepper').addEventListener('click', (event) => {
        if (event.target.classList.contains('next-button')) {
            stepper.navigateStep('next');
         
        } else if (event.target.classList.contains('back-button')) {
            stepper.navigateStep('back');
        
        }
    });

    // Populate radio button labels with their 'value'
    const inputsWithLabels = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
    inputsWithLabels.forEach(input => {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) {
            label.textContent = input.value;
        }
    });

    //Add asterisks to all required fields
    const requiredInputs = document.querySelectorAll('.required-label');
    requiredInputs.forEach(input => {
    if (input) {
        const asterisk = document.createElement('span');
        asterisk.textContent = '* ';
        asterisk.classList.add('label-ast');

        input.insertBefore(asterisk, input.firstChild);
    }
    });

  
    //Accordion functionality
    const accordions = document.querySelectorAll('.accordion');
    accordions.forEach(accordion => {
        accordion.addEventListener('click', function() {
            this.classList.toggle('active');

        });
    });
    
});

///start here - not working
window.addEventListener('beforeunload', (event) => {
    if (!sessionStorage.getItem("navigatingToConfirmation")) {
        sessionStorage.clear();
    }
    sessionStorage.removeItem("navigatingToConfirmation"); // Reset flag after navigation
});
