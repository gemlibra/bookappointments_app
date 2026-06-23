/* ==========================================================================
   SECTION 1: STATE DATABASE INITIALIZATION
   ========================================================================== */
let appointmentDatabase = [];

// Initialize database from the browser's hidden LocalStorage cabinet on boot
try {
    const savedData = localStorage.getItem('appointments');
    if (savedData) {
        appointmentDatabase = JSON.parse(savedData);
    }
} catch (e) {
    console.error("Failed to read from LocalStorage cabinet:", e);
}

/* ==========================================================================
   SECTION 2: DOM ELEMENT SELECTORS
   ========================================================================== */
const bookingView = document.getElementById('booking-view');
const adminView = document.getElementById('admin-view');
const successModal = document.getElementById('success-modal');
const appointmentForm = document.getElementById('appointment-form');

// View Switching Buttons
const goToAdminBtn = document.getElementById('go-to-admin');
const goToBookingBtn = document.getElementById('go-to-booking');

// Search Inputs
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchResultsContainer = document.getElementById('search-results-container');


/* ==========================================================================
   SECTION 3: VIEW CONTROLLERS (ROUTING SCENES)
   ========================================================================== */
goToAdminBtn.addEventListener('click', () => {
    bookingView.classList.add('hidden');
    adminView.classList.remove('hidden');
    executeSearch(); // Automatically refresh list on click
});

goToBookingBtn.addEventListener('click', () => {
    // If exiting back manually, ensure we clear out any stale edit markers
    appointmentForm.removeAttribute('data-editing-id');
    appointmentForm.reset();
    document.querySelector('#appointment-form button[type="submit"]').textContent = "Book Now";
    
    adminView.classList.add('hidden');
    bookingView.classList.remove('hidden');
});


/* ==========================================================================
   SECTION 4: CORE SUBMISSION PIPELINE (CREATE & UPDATE Engines)
   ========================================================================== */
appointmentForm.addEventListener('submit', function(e) {
    e.preventDefault();

    // 1. Gather all input values from UI
    const firstName = document.getElementById('first-name').value.trim();
    const lastName = document.getElementById('last-name').value.trim();
    const language = document.getElementById('preferred-language').value;
    const dob = document.getElementById('dob').value;
    const date = document.getElementById('appointment-date').value;
    const time = document.getElementById('appointment-time').value;
    const facility = document.getElementById('medical-service').value;

    // Advanced human-readable calendar string parser (e.g., "Tuesday, June 23")
    const dateObj = new Date(date + 'T00:00:00');
    const dayOptions = { weekday: 'long' };
    const dateOptions = { month: 'long', day: 'numeric' };
    const formattedDay = dateObj.toLocaleDateString('en-US', dayOptions) + ",";
    
    // Time formatter to convert military strings to standard AM/PM format
    const [hours, minutes] = time.split(':');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const formattedTime = `${displayHours}:${minutes} ${ampm} EST`;
    const formattedDateTime = `${dateObj.toLocaleDateString('en-US', dateOptions)}, ${formattedTime}`;

    // Check if the form is in EDIT mode or CREATE mode
    const editingId = appointmentForm.getAttribute('data-editing-id');

    if (editingId) {
        // ==========================================
        // PIPELINE UPDATE ACTION (Save Changes)
        // ==========================================
        const recordIndex = appointmentDatabase.findIndex(item => item.id === editingId);
        
        if (recordIndex !== -1) {
            appointmentDatabase[recordIndex] = {
                id: editingId, // Keep original record identity tag
                firstName,
                lastName,
                language,
                dob,
                date,
                time,
                facility,
                day: formattedDay,
                datetime: formattedDateTime
            };
            
            console.log(`Successfully updated appointment ID: ${editingId}`);
        }
        
        // Clean up editing trace tags and reset submit action text
        appointmentForm.removeAttribute('data-editing-id');
        document.querySelector('#appointment-form button[type="submit"]').textContent = "Book Now";
        
        // Save database array state changes directly to LocalStorage
        localStorage.setItem('appointments', JSON.stringify(appointmentDatabase));
        appointmentForm.reset();

        // Send Admin seamlessly back to the dashboard panel
        bookingView.classList.add('hidden');
        adminView.classList.remove('hidden');
        executeSearch();

    } else {
        // ==========================================
        // PIPELINE CREATE ACTION (New Booking)
        // ==========================================
        const newAppointment = {
            id: 'nao_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            firstName,
            lastName,
            language,
            dob,
            date,
            time,
            facility,
            day: formattedDay,
            datetime: formattedDateTime
        };

        appointmentDatabase.push(newAppointment);
        localStorage.setItem('appointments', JSON.stringify(appointmentDatabase));
        appointmentForm.reset();

        // Fire standard Success Modal notification triggers
        successModal.classList.remove('hidden');
        setTimeout(() => {
            successModal.classList.add('hidden');
        }, 3000);
    }
});


/* ==========================================================================
   SECTION 5: ADMIN PANEL SEARCH SYSTEM & DYNAMIC TEMPLATING
   ========================================================================== */
searchBtn.addEventListener('click', executeSearch);
searchInput.addEventListener('keyup', function(e) {
    if (e.key === 'Enter') executeSearch();
});

function executeSearch() {
    const query = searchInput.value.toLowerCase().trim();
    searchResultsContainer.innerHTML = ''; // Wipe panel container clean

    // Filter down local collection parameters
    const filteredResults = appointmentDatabase.filter(app => {
        return app.firstName.toLowerCase().includes(query) || 
               app.lastName.toLowerCase().includes(query);
    });

    if (filteredResults.length === 0) {
        searchResultsContainer.innerHTML = `<p class="text-muted" style="text-align:center; margin-top:20px;">No appointments found matching that name.</p>`;
        return;
    }

    const template = document.getElementById('appointment-card-template');

    filteredResults.forEach(app => {
        const cardClone = template.content.cloneNode(true);

        // Bind raw object indices directly into view tags
        cardClone.querySelector('.card-firstname').textContent = app.firstName;
        cardClone.querySelector('.card-fullname').textContent = app.firstName + " " + app.lastName;
        cardClone.querySelector('.card-day').textContent = app.day || "Appointment Day,";
        cardClone.querySelector('.card-datetime').textContent = app.datetime || (app.date + " at " + app.time);
        cardClone.querySelector('.facility-name').textContent = app.facility;

        const dobContainer = cardClone.querySelector('.patient-dob');
        if (app.dob) {
            cardClone.querySelector('.card-dob').textContent = app.dob;
            if (dobContainer) dobContainer.classList.remove('hidden'); 
        }

        // ==========================================
        // ACTION CONTROL 1: MODIFY APPOINTMENT BUTTON
        // ==========================================
        const modifyBtn = cardClone.querySelector('.btn-modify');
        if (modifyBtn) {
            modifyBtn.addEventListener('click', function() {
                // Populate main booking layout form inputs with current data state values
                document.getElementById('first-name').value = app.firstName;
                document.getElementById('last-name').value = app.lastName;
                document.getElementById('preferred-language').value = app.language || "English";
                document.getElementById('dob').value = app.dob || '';
                document.getElementById('appointment-date').value = app.date;
                document.getElementById('appointment-time').value = app.time;
                document.getElementById('medical-service').value = app.facility;

                // Stamp editing key tracker onto form node element wrapper
                appointmentForm.setAttribute('data-editing-id', app.id);
                
                // Change submit action text indicator string inside the UI view button
                document.querySelector('#appointment-form button[type="submit"]').textContent = "Save Changes";

                // FIXED: Removed rogue .remove() method call so layout stays visible!
                adminView.classList.add('hidden');
                bookingView.classList.remove('hidden');
            });
        }

        // ==========================================
        // ACTION CONTROL 2: CANCEL APPOINTMENT BUTTON
        // ==========================================
        const cancelBtn = cardClone.querySelector('.btn-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                if (confirm(`Are you sure you want to cancel the appointment for ${app.firstName} ${app.lastName}?`)) {
                    appointmentDatabase = appointmentDatabase.filter(item => item.id !== app.id);
                    localStorage.setItem('appointments', JSON.stringify(appointmentDatabase));
                    executeSearch(); // Instantly update view container
                }
            });
        }

        searchResultsContainer.appendChild(cardClone);
    });
}