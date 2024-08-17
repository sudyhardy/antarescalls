document.addEventListener('DOMContentLoaded', () => {
    const rooms = [
        '001', '002', '003', '004', '005', '006', '007', '008', '009', '010',
        '011', '012', '013', '014', '015', '016', '017', '018', '019', '020',
        '021', '101', '102', '103', '104', '105', '106', '107', '108', '109',
        '110', '111', '112', '113', '114', '115', '116', '117', '118', '119',
        '120', '121', '122', '123', '124', '125', '126', '127', '128', '201',
        '202', '203', '204', '205', '206', '207', '208', '209', '210', '211',
        '212', '213', '214', '215', '216', '217', '218', '219', '220', '221',
        '222', '223', '224', '225', '226', '227', '228', '229', '301', '302',
        '303', '304', '305', '306', '307', '308', '309', '310', '311', '312',
        '313', '314', '315', '316', '317', '318', '319', '320', '321', '322',
        '323', '324', '325', '326', '327', '328', '329', '401', '402', '403',
        '404', '405', '406', '407', '408', '409', '410', '411', '412', '413',
        '414', '415', '416', '417', '418', '419', '420', '421', '422', '423',
        '424', '425', '426', '427', '428', '429'
    ];

    const names = ['Natalia', 'Chantal', 'Sudi', 'Dylan', 'Samira', 'Abdo', 'Ibo', 'Mo', 'Ammar'];

    const roomSelect = document.getElementById('roomSelect');
    const checkInButton = document.getElementById('checkInButton');
    const tbody = document.getElementById('checkin-tbody');
    const currentDayElem = document.getElementById('currentDay');
    const currentDateElem = document.getElementById('currentDate');
    const checkedInRooms = new Set();

    // Populate the room select dropdown
    rooms.forEach(room => {
        const option = document.createElement('option');
        option.value = room;
        option.textContent = room;
        roomSelect.appendChild(option);
    });

    // Function to get the current time in Amsterdam timezone
    const getAmsterdamTime = () => {
        const now = new Date();
        const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
        const amsterdamTime = new Date(utcTime + (2 * 3600000)); // Adjust for UTC+2 or UTC+1 as needed
        return amsterdamTime;
    };

    // Function to update the current day and date
    const updateCurrentDayAndDate = () => {
        const now = getAmsterdamTime();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        currentDayElem.textContent = dayNames[now.getDay()];
        currentDateElem.textContent = now.toLocaleDateString('en-GB');
    };

    const loadCheckInData = async () => {
        try {
            const response = await fetch('/api/checkins');
            const data = await response.json();
            data.forEach(row => {
                addTableRow(
                    row.room,
                    new Date(row.checkInTime),
                    row._id,
                    row.comments,
                    row.calledBy,
                    row.solvedStatus // Pass solvedStatus to addTableRow
                );
            });
        } catch (err) {
            console.error('Error loading check-in data:', err);
        }
    };
    

    // Function to save check-in data to the server
    const addCheckIn = async (room, checkInTime) => {
        try {
            const response = await fetch('/api/checkins', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ room, checkInTime })
            });
            const data = await response.json();
            addTableRow(room, new Date(data.checkInTime), data._id);
        } catch (err) {
            console.error('Error adding check-in:', err);
        }
    };

    // Function to delete check-in data from the server
    const deleteCheckIn = async (id, row) => {
        try {
            await fetch(`/api/checkins/${id}`, { method: 'DELETE' });
            row.remove();
            checkedInRooms.delete(id);
        } catch (err) {
            console.error('Error deleting check-in:', err);
        }
    };

    const updateSolvedStatus = async (id, solvedStatus) => {
        try {
            await fetch(`/api/checkins/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ solvedStatus }),
            });
        } catch (err) {
            console.error('Error updating solved status:', err);
        }
    };  

    const addTableRow = (room, checkInTime, id, comments = '', calledBy = '', solvedStatus = '') => {
        const row = document.createElement('tr');
        const roomNumberCell = document.createElement('td');
        const checkInTimeCell = document.createElement('td');
        const countdownCell = document.createElement('td');
        const actionCell = document.createElement('td');
        const commentsCell = document.createElement('td');
        const calledByCell = document.createElement('td');
        const solvedCell = document.createElement('td'); // New cell for "Solved?" column
        const deleteCell = document.createElement('td');
    
        roomNumberCell.textContent = room;
        checkInTimeCell.textContent = checkInTime.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        checkInTimeCell.setAttribute('data-time', checkInTime.toISOString());
        countdownCell.textContent = 'Calculating...';
    
        const callButton = document.createElement('button');
        callButton.className = 'call-button';
        callButton.textContent = 'Call';
        callButton.disabled = true;
    
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.textContent = 'X';
    
        actionCell.appendChild(callButton);
        deleteCell.appendChild(deleteButton);
    
        row.appendChild(roomNumberCell);
        row.appendChild(checkInTimeCell);
        row.appendChild(countdownCell);
        row.appendChild(actionCell);
        row.appendChild(commentsCell);
        row.appendChild(calledByCell);
        row.appendChild(solvedCell); // Append the new "Solved?" column
        row.appendChild(deleteCell);
    
        tbody.appendChild(row);
    
        checkedInRooms.add(room);
    
        if (comments) {
            commentsCell.textContent = comments;
            commentsCell.style.color = comments.includes('Complain') || comments.includes('Not picked up') ? 'red' : 'green';
    
            // If there's a complaint, add a dropdown for "Solved?" status
            if (comments.includes('Complain')) {
                const solvedDropdown = document.createElement('select');
    
                const optionSelect = document.createElement('option');
                optionSelect.value = '';
                optionSelect.textContent = 'Select';
                optionSelect.disabled = true;
                optionSelect.selected = !solvedStatus; // Default to "Select" if no status
    
                const optionSolved = document.createElement('option');
                optionSolved.value = 'Solved';
                optionSolved.textContent = 'Solved';
                if (solvedStatus === 'Solved') optionSolved.selected = true;
    
                const optionNotSolved = document.createElement('option');
                optionNotSolved.value = 'Not Solved';
                optionNotSolved.textContent = 'Not Solved';
                if (solvedStatus === 'Not Solved') optionNotSolved.selected = true;
    
                solvedDropdown.appendChild(optionSelect);
                solvedDropdown.appendChild(optionSolved);
                solvedDropdown.appendChild(optionNotSolved);
    
                solvedCell.appendChild(solvedDropdown);
    
                // Save the solved status to the server when changed
                solvedDropdown.addEventListener('change', () => {
                    const newSolvedStatus = solvedDropdown.value;
                    updateSolvedStatus(id, newSolvedStatus);
                });
            }
        }
    
        if (calledBy) {
            calledByCell.textContent = calledBy;
        }
    
        // Countdown logic
        const interval = setInterval(() => {
            const now = new Date();
            const diff = 10 * 60 * 1000 - (now - checkInTime); // 1 minute in milliseconds for testing
            if (diff <= 0) {
                clearInterval(interval);
                countdownCell.textContent = '00:00';
                if (!comments) {
                    callButton.disabled = false;
                }
            } else {
                const minutes = Math.floor(diff / 1000 / 60);
                const seconds = Math.floor((diff / 1000) % 60);
                countdownCell.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    
        callButton.addEventListener('click', () => {
            if (callButton.disabled) {
                alert("You have called this room!");
            } else {
                showCountdownPopup(5, "Please call the room now!", () => {
                    handlePickup(id, commentsCell, calledByCell, callButton);
                });
            }
        });
    
        deleteButton.addEventListener('click', () => {
            clearInterval(interval);
            deleteCheckIn(id, row);
        });
    };
    
 
    const updateCommentsAndCalledBy = async (id, comments, calledBy) => {
        try {
            await fetch(`/api/checkins/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ comments, calledBy }),
            });
        } catch (err) {
            console.error('Error updating comments and calledBy:', err);
        }
    };

    const showCountdownPopup = (seconds, message, callback) => {
        let remainingSeconds = seconds;
        const countdownPopup = document.createElement('div');
        countdownPopup.style.position = 'fixed';
        countdownPopup.style.left = '50%';
        countdownPopup.style.top = '50%';
        countdownPopup.style.transform = 'translate(-50%, -50%)';
        countdownPopup.style.backgroundColor = 'white';
        countdownPopup.style.padding = '60px'; // Increased padding for bigger size
        countdownPopup.style.boxShadow = '0px 0px 10px rgba(0, 0, 0, 0.1)';
        countdownPopup.style.textAlign = 'center';
        countdownPopup.style.zIndex = '1000';
        countdownPopup.style.fontSize = '24px'; // Increase font size

        const messageElem = document.createElement('p');
        messageElem.textContent = `${message}`;
        countdownPopup.appendChild(messageElem);

        const countdownElem = document.createElement('p');
        countdownElem.textContent = `Continuing in ${remainingSeconds} seconds...`;
        countdownPopup.appendChild(countdownElem);

        document.body.appendChild(countdownPopup);

        const countdownInterval = setInterval(() => {
            remainingSeconds -= 1;
            countdownElem.textContent = `Continuing in ${remainingSeconds} seconds...`;
            if (remainingSeconds <= 0) {
                clearInterval(countdownInterval);
                document.body.removeChild(countdownPopup);
                callback();
            }
        }, 1000);
    };

    const showYesNoPopup = (message, callback) => {
        const popup = document.createElement('div');
        popup.style.position = 'fixed';
        popup.style.left = '50%';
        popup.style.top = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.backgroundColor = 'white';
        popup.style.padding = '60px'; // Increased padding for bigger size
        popup.style.boxShadow = '0px 0px 10px rgba(0, 0, 0, 0.1)';
        popup.style.textAlign = 'center';
        popup.style.zIndex = '1000';
        popup.style.fontSize = '24px'; // Increase font size

        const messageElem = document.createElement('p');
        messageElem.textContent = message;
        popup.appendChild(messageElem);

        const buttonYes = document.createElement('button');
        buttonYes.textContent = 'Yes';
        buttonYes.style.marginRight = '20px'; // Adjust margin for larger buttons
        buttonYes.style.padding = '10px 20px'; // Increase button size
        buttonYes.style.fontSize = '20px'; // Increase font size for button text
        buttonYes.style.backgroundColor = 'blue'; // Blue button color
        buttonYes.style.color = 'white'; // White text color
        buttonYes.style.border = 'none';
        buttonYes.style.cursor = 'pointer';
        buttonYes.addEventListener('click', () => {
            document.body.removeChild(popup);
            callback(true);
        });
        popup.appendChild(buttonYes);

        const buttonNo = document.createElement('button');
        buttonNo.textContent = 'No';
        buttonNo.style.padding = '10px 20px'; // Increase button size
        buttonNo.style.fontSize = '20px'; // Increase font size for button text
        buttonNo.style.backgroundColor = 'blue'; // Blue button color
        buttonNo.style.color = 'white'; // White text color
        buttonNo.style.border = 'none';
        buttonNo.style.cursor = 'pointer';
        buttonNo.addEventListener('click', () => {
            document.body.removeChild(popup);
            callback(false);
        });
        popup.appendChild(buttonNo);

        document.body.appendChild(popup);
    };

    const showNameSelectionPopup = (message, names, callback) => {
        const popup = document.createElement('div');
        popup.style.position = 'fixed';
        popup.style.left = '50%';
        popup.style.top = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.backgroundColor = 'white';
        popup.style.padding = '60px';
        popup.style.boxShadow = '0px 0px 10px rgba(0, 0, 0, 0.1)';
        popup.style.textAlign = 'center';
        popup.style.zIndex = '1000';
        popup.style.fontSize = '24px';
    
        const messageElem = document.createElement('p');
        messageElem.textContent = message;
        popup.appendChild(messageElem);
    
        const formElem = document.createElement('form');
        formElem.style.textAlign = 'left';
    
        names.forEach(name => {
            const label = document.createElement('label');
            label.style.display = 'block';
            label.style.fontSize = '20px';
            
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'name';
            radio.value = name;
            radio.style.marginRight = '10px';
            
            label.appendChild(radio);
            label.appendChild(document.createTextNode(name));
            formElem.appendChild(label);
        });
    
        // Add the "Other" option with a text input
        const otherLabel = document.createElement('label');
        otherLabel.style.display = 'block';
        otherLabel.style.fontSize = '20px';
    
        const otherRadio = document.createElement('input');
        otherRadio.type = 'radio';
        otherRadio.name = 'name';
        otherRadio.value = 'other';
        otherRadio.style.marginRight = '10px';
    
        const otherTextInput = document.createElement('input');
        otherTextInput.type = 'text';
        otherTextInput.placeholder = 'Enter your name';
        otherTextInput.style.marginLeft = '10px';
        otherTextInput.style.fontSize = '20px';
        otherTextInput.disabled = true; // Disable input by default
    
        otherRadio.addEventListener('change', () => {
            otherTextInput.disabled = !otherRadio.checked;
            if (otherRadio.checked) {
                otherTextInput.focus();
            }
        });
    
        otherTextInput.addEventListener('input', () => {
            if (otherRadio.checked) {
                submitButton.disabled = otherTextInput.value.trim() === '';
            }
        });
    
        otherLabel.appendChild(otherRadio);
        otherLabel.appendChild(document.createTextNode('Other'));
        otherLabel.appendChild(otherTextInput);
        formElem.appendChild(otherLabel);
    
        popup.appendChild(formElem);
    
        const submitButton = document.createElement('button');
        submitButton.textContent = 'Submit';
        submitButton.style.padding = '10px 20px';
        submitButton.style.fontSize = '20px';
        submitButton.style.backgroundColor = 'blue';
        submitButton.style.color = 'white';
        submitButton.style.border = 'none';
        submitButton.style.cursor = 'pointer';
        submitButton.disabled = true;
    
        formElem.addEventListener('change', () => {
            const selectedRadio = formElem.querySelector('input[name="name"]:checked');
            if (selectedRadio) {
                if (selectedRadio.value !== 'other') {
                    submitButton.disabled = false;
                } else {
                    submitButton.disabled = otherTextInput.value.trim() === '';
                }
            }
        });
    
        submitButton.addEventListener('click', () => {
            const selectedRadio = formElem.querySelector('input[name="name"]:checked');
            let selectedName = selectedRadio.value;
            if (selectedName === 'other') {
                selectedName = otherTextInput.value.trim();
            }
    
            document.body.removeChild(popup);
            callback(selectedName);
        });
    
        popup.appendChild(submitButton);
        document.body.appendChild(popup);
    };    

    const handlePickup = (id, commentsCell, calledByCell, callButton) => {
        showYesNoPopup("Did it pick up?", (didPickUp) => {
            if (!didPickUp) {
                commentsCell.textContent = "Not picked up";
                commentsCell.style.color = "blue";
                showNameSelectionPopup("Thanks, and you must be?", names, (calledBy) => {
                    calledByCell.textContent = calledBy;
                    updateCommentsAndCalledBy(id, "Not picked up", calledBy); // Update comments and calledBy in the database
                });
            } else {
                handleComplain(id, commentsCell, calledByCell);
            }
            callButton.disabled = true; // Disable the call button after a comment is posted
        });
    };

    const handleComplain = (id, commentsCell, calledByCell) => {
        showYesNoPopup("Has complain?", (hasComplain) => {
            if (!hasComplain) {
                commentsCell.textContent = "Answered, All Good";
                commentsCell.style.color = "green";
                showNameSelectionPopup("Thanks, and you must be?", names, (calledBy) => {
                    calledByCell.textContent = calledBy;
                    updateCommentsAndCalledBy(id, "Answered, All Good", calledBy); // Update comments and calledBy in the database
                });
            } else {
                const complain = prompt("Write the complain here:");
                if (complain) {
                    commentsCell.textContent = `Complain: ${complain}`;
                    commentsCell.style.color = "red";
                    showNameSelectionPopup("Thanks, and you must be?", names, (calledBy) => {
                        calledByCell.textContent = calledBy;
                        updateCommentsAndCalledBy(id, `Complain: ${complain}`, calledBy); // Update comments and calledBy in the database
                        
                        // Add the "Solved?" dropdown immediately after the complaint is recorded
                        const solvedCell = commentsCell.parentElement.querySelector('td:last-child').previousElementSibling;
                        
                        const solvedDropdown = document.createElement('select');
    
                        const optionSelect = document.createElement('option');
                        optionSelect.value = '';
                        optionSelect.textContent = 'Select';
                        optionSelect.disabled = true;
                        optionSelect.selected = true;
    
                        const optionSolved = document.createElement('option');
                        optionSolved.value = 'Solved';
                        optionSolved.textContent = 'Solved';
    
                        const optionNotSolved = document.createElement('option');
                        optionNotSolved.value = 'Not Solved';
                        optionNotSolved.textContent = 'Not Solved';
    
                        solvedDropdown.appendChild(optionSelect);
                        solvedDropdown.appendChild(optionSolved);
                        solvedDropdown.appendChild(optionNotSolved);
    
                        solvedCell.appendChild(solvedDropdown);
    
                        solvedDropdown.addEventListener('change', () => {
                            const newSolvedStatus = solvedDropdown.value;
                            updateSolvedStatus(id, newSolvedStatus);
                        });
                    });
                }
            }
        });
    };    

    // Schedule PDF download at 23:55
    const schedulePdfDownload = () => {
        const now = new Date();
        const millisUntil2350 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 55, 0, 0) - now;

        if (millisUntil2350 > 0) {
            setTimeout(() => {
                generatePdf();
                scheduleRowDeletion(); // Schedule deletion 5 minutes later
                schedulePdfDownload(); // Reschedule for the next day
            }, millisUntil2350);
        } else {
            schedulePdfDownload(); // If it's already past 23:50, schedule for the next day
        }
    };

    // Schedule row deletion 5 minutes after 23:55
    const scheduleRowDeletion = () => {
        setTimeout(() => {
            clearTableAndDatabase();
        }, 5 * 60 * 1000); // 5 minutes in milliseconds
    };

    const generatePdf = () => {
        const element = document.querySelector('main');
        const opt = {
            margin: 1,
            filename: `AntaresCallCheckIn_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().from(element).set(opt).save();
    };

    const clearTableAndDatabase = async () => {
        // Clear all rows from the table
        tbody.innerHTML = '';

        // Clear all entries from the database
        try {
            await fetch('/api/checkins', { method: 'DELETE' });
        } catch (err) {
            console.error('Error clearing database:', err);
        }
    };

    schedulePdfDownload();

    // Update day and date every minute
    setInterval(updateCurrentDayAndDate, 60000);
    updateCurrentDayAndDate();

// Initialize Howl object for your alert sound
const alertSound = new Howl({
    src: ['./alert.wav'], // Your sound file path
    preload: true
});

// Function to calculate remaining time
function calculateRemainingTime(startTime, delay) {
    const currentTime = new Date().getTime();
    const elapsed = currentTime - startTime;
    const remainingTime = delay - elapsed;
    return remainingTime > 0 ? remainingTime : 0;
}

// Check-in button click event
checkInButton.addEventListener('click', () => {
    const selectedRoom = roomSelect.value;

    if (checkedInRooms.has(selectedRoom)) {
        alert(`Room ${selectedRoom} is already checked in.`);
        return;
    }

    const checkInTime = getAmsterdamTime();
    addCheckIn(selectedRoom, checkInTime);

    // Store the start time in localStorage
    const startTime = new Date().getTime();
    localStorage.setItem(`startTime-${selectedRoom}`, startTime);

    // Set the timer to play the sound after 10 minutes (600,000 milliseconds)
    const delay = 600000; // 10 minutes in milliseconds
    const timeoutId = setTimeout(() => {
        alertSound.play(); // Play sound using Howler.js
    }, delay);

    // Store the timeout ID in localStorage to manage it on page refresh
    localStorage.setItem(`timeoutId-${selectedRoom}`, timeoutId);
});

// On page load, check if there's a saved start time and calculate remaining time
window.addEventListener('load', () => {
    const selectedRoom = roomSelect.value;
    const savedStartTime = localStorage.getItem(`startTime-${selectedRoom}`);

    if (savedStartTime) {
        const remainingTime = calculateRemainingTime(parseInt(savedStartTime), 600000);

        if (remainingTime > 0) {
            // If there's still time left, set a new timeout for the remaining time
            const timeoutId = setTimeout(() => {
                alertSound.play(); // Play sound using Howler.js
            }, remainingTime);

            // Update the timeout ID in localStorage
            localStorage.setItem(`timeoutId-${selectedRoom}`, timeoutId);
        } else if (remainingTime === 0) {
            // Play the sound if remaining time is exactly 0 (not less)
            alertSound.play();
        }
    }
});

    // Load saved data on page load
    loadCheckInData();
});