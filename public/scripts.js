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

    // Initialize Socket.IO
    const socket = io();

    // Populate the room select dropdown
    rooms.forEach(room => {
        const option = document.createElement('option');
        option.value = room;
        option.textContent = room;
        roomSelect.appendChild(option);
    });

    // Function to get the current time in Amsterdam timezone
    const getAmsterdamTime = () => {
        return moment().tz('Europe/Amsterdam').toDate();
    };

    // Function to update the current day and date
    const updateCurrentDayAndDate = () => {
        const now = getAmsterdamTime();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        currentDayElem.textContent = dayNames[now.getDay()];
        currentDateElem.textContent = now.toLocaleDateString('en-GB');
    };

 // Function to load check-in data from the server
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

// Socket.IO Event Listeners
socket.on('newCheckIn', (checkIn) => {
    if (!document.querySelector(`tr[data-id="${checkIn._id}"]`)) {
        addTableRow(
            checkIn.room,
            new Date(checkIn.checkInTime),
            checkIn._id,
            checkIn.comments,
            checkIn.calledBy,
            checkIn.solvedStatus
        );
    }
});

socket.on('deleteCheckIn', (id) => {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (row) row.remove();
    checkedInRooms.delete(id);
});


// Handle updated check-ins
socket.on('checkInUpdated', (update) => {
    // Find the existing row
    const row = document.querySelector(`tr[data-id="${update._id}"]`);
    if (row) {
        // Update the row with new data
        const commentsCell = row.querySelector('td:nth-child(5)');
        const calledByCell = row.querySelector('td:nth-child(6)');
        const solvedCell = row.querySelector('td:nth-child(7)');
        const actionCell = row.querySelector('td:nth-child(4)');

        if (update.comments !== undefined) {
            commentsCell.textContent = update.comments;
            if (update.comments.includes('Complain')) {
                commentsCell.style.color = 'red';
            } else if (update.comments.includes('Not picked up')) {
                commentsCell.style.color = 'blue';
            } else {
                commentsCell.style.color = 'green';
            }
        }

        if (update.calledBy !== undefined) {
            calledByCell.textContent = update.calledBy;
        }

        if (update.solvedStatus !== undefined && update.comments.includes('Complain')) {
            let solvedDropdown = solvedCell.querySelector('select');
            if (solvedDropdown) {
                solvedDropdown.value = update.solvedStatus;
            } else {
                // Create and append dropdown if not already present
                solvedDropdown = document.createElement('select');
                const options = ['Select', 'Solved', 'Not Solved'].map(status => {
                    const option = document.createElement('option');
                    option.value = status;
                    option.textContent = status;
                    if (status === update.solvedStatus) option.selected = true;
                    return option;
                });
                options.forEach(option => solvedDropdown.appendChild(option));
                solvedCell.appendChild(solvedDropdown);

                // Handle change event for new dropdown
                solvedDropdown.addEventListener('change', () => {
                    const newSolvedStatus = solvedDropdown.value;
                    updateSolvedStatus(update._id, newSolvedStatus);
                });
            }
        } else {
            // Remove the dropdown if comments no longer include "Complain"
            solvedCell.innerHTML = '';
        }

        // Update the action column
        const callButton = actionCell.querySelector('.call-button');
        if (callButton) {
            callButton.disabled = !update.comments.includes('Not picked up');
            if (update.comments.includes('Not picked up')) {
                callButton.style.display = 'none'; // Hide the call button if comments include "Not picked up"
            }
        }
    } else {
        // Row doesn't exist, add a new one
        addTableRow(update.room, new Date(update.checkInTime), update._id, update.comments, update.calledBy, update.solvedStatus);
    }
});

// Function to update solved status on the server
const updateSolvedStatus = async (id, solvedStatus) => {
    try {
        await fetch(`/api/checkins/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ solvedStatus }),
        });
        socket.emit('checkInUpdated', { _id: id, solvedStatus }); // Emit event to other clients
    } catch (err) {
        console.error('Error updating solved status:', err);
    }
};

    // Function to delete a check-in
const deleteCheckIn = async (id, row) => {
    try {
        await fetch(`/api/checkins/${id}`, { method: 'DELETE' });
        socket.emit('deleteCheckIn', id); // Emit event to other clients
        tbody.removeChild(row);
        checkedInRooms.delete(row.querySelector('td:first-child').textContent);
    } catch (err) {
        console.error('Error deleting check-in:', err);
    }
};

// Function to clear all check-ins
const clearTableAndDatabase = async () => {
    try {
        await fetch('/api/checkins', { method: 'DELETE' });
        socket.emit('clearTableAndDatabase'); // Emit event to other clients
        tbody.innerHTML = '';
        checkedInRooms.clear();
    } catch (err) {
        console.error('Error clearing all check-ins:', err);
    }
};

// Handle clear all check-ins event
socket.on('clearTableAndDatabase', () => {
    tbody.innerHTML = '';
    checkedInRooms.clear();
});

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
            if (!document.querySelector(`tr[data-id="${data._id}"]`)) {
                socket.emit('newCheckIn', data); // Emit event to other clients
                addTableRow(room, new Date(data.checkInTime), data._id);
                socket.emit('playAlertSound', data._id); // Emit alert sound event to all clients
            }
        } catch (err) {
            console.error('Error adding check-in:', err);
        }
    };
    

    // Function to update check-in data on the server
    const updateCheckIn = async (id, room, checkInTime) => {
        try {
            const response = await fetch(`/api/checkins/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ room, checkInTime })
            });
            const data = await response.json();
            socket.emit('checkInUpdated', data);
        } catch (err) {
            console.error('Error updating check-in:', err);
        }
    };

    const addTableRow = (room, checkInTime, id, comments = '', calledBy = '', solvedStatus = '') => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', id);
        const roomNumberCell = document.createElement('td');
        const checkInTimeCell = document.createElement('td');
        const countdownCell = document.createElement('td');
        const actionCell = document.createElement('td');
        const commentsCell = document.createElement('td');
        const calledByCell = document.createElement('td');
        const solvedCell = document.createElement('td');
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
        row.appendChild(solvedCell);
        row.appendChild(deleteCell);
    
        tbody.appendChild(row);
    
        checkedInRooms.add(room);
    
        if (comments) {
            commentsCell.textContent = comments;
            if (comments.includes('Complain')) {
                commentsCell.style.color = 'red';
            } else if (comments.includes('Not picked up')) {
                commentsCell.style.color = 'blue';
            } else {
                commentsCell.style.color = 'green';
            }
    
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
            const diff = 10 * 60 * 1000 - (now - checkInTime); // 10 minutes in milliseconds
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
            socket.emit('updateCheckIn', { id, comments, calledBy }); // Emit event to other clients
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
        countdownPopup.style.padding = '60px';
        countdownPopup.style.boxShadow = '0px 0px 10px rgba(0, 0, 0, 0.1)';
        countdownPopup.style.textAlign = 'center';
        countdownPopup.style.zIndex = '1000';
        countdownPopup.style.fontSize = '24px';

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
        popup.style.padding = '60px';
        popup.style.boxShadow = '0px 0px 10px rgba(0, 0, 0, 0.1)';
        popup.style.textAlign = 'center';
        popup.style.zIndex = '1000';
        popup.style.fontSize = '24px';

        const messageElem = document.createElement('p');
        messageElem.textContent = message;
        popup.appendChild(messageElem);

        const buttonYes = document.createElement('button');
        buttonYes.textContent = 'Yes';
        buttonYes.style.marginRight = '20px';
        buttonYes.style.padding = '10px 20px';
        buttonYes.style.fontSize = '20px';
        buttonYes.style.backgroundColor = 'blue';
        buttonYes.style.color = 'white';
        buttonYes.style.border = 'none';
        buttonYes.style.cursor = 'pointer';
        buttonYes.addEventListener('click', () => {
            document.body.removeChild(popup);
            callback(true);
        });
        popup.appendChild(buttonYes);

        const buttonNo = document.createElement('button');
        buttonNo.textContent = 'No';
        buttonNo.style.padding = '10px 20px';
        buttonNo.style.fontSize = '20px';
        buttonNo.style.backgroundColor = 'blue';
        buttonNo.style.color = 'white';
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
        otherTextInput.disabled = true;

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
                    socket.emit('checkInUpdated', { id, comments: "Not picked up", calledBy }); // Emit event to other clients
                });
            } else {
                handleComplain(id, commentsCell, calledByCell);
            }
            callButton.disabled = true; // Disable the call button after a comment is posted
            callButton.style.display = 'none'; // Hide the call button after submission
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
                scheduleRowDeletion();
                schedulePdfDownload(); 
            }, millisUntil2350);
        } else {
            schedulePdfDownload(); 
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
            jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
        };
        html2pdf().from(element).set(opt).save();
    };


    schedulePdfDownload();

    // Update day and date every minute
    setInterval(updateCurrentDayAndDate, 60000);
    updateCurrentDayAndDate();


    // Handle play alert sound event
    socket.on('playAlertSound', (id) => {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (row) {
        alertSound.play();
    }
    });

    // Initialize Howl object for your alert sound
    const alertSound = new Howl({
        src: ['./alert.wav'], // Your sound file path
        preload: true
    });

    // Check-in button click event
    checkInButton.addEventListener('click', () => {
        const selectedRoom = roomSelect.value;

        if (checkedInRooms.has(selectedRoom)) {
            alert(`Room ${selectedRoom} is already checked in.`);
            return;
        }

        const checkInTime = Date.now();
        addCheckIn(selectedRoom, checkInTime);

        // Set timer for remaining time until sound should play
        setTimeout(() => {
            alertSound.play(); // Play sound using Howler.js
        }, 600000); // 10 minutes in milliseconds
    });

    // Load saved data on page load
    loadCheckInData();
});
