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

    // Function to load check-in data from the server
    const loadCheckInData = async () => {
        try {
            const response = await fetch('/api/checkins');
            const data = await response.json();
            data.forEach(row => {
                const checkInTime = new Date(row.checkInTime);
                if (isNaN(checkInTime)) {
                    console.error('Invalid Date:', row.checkInTime);
                    return;
                }
                addTableRow(
                    row.room,
                    checkInTime, // Ensure the date is correctly formatted
                    row.id,
                    row.comments,
                    row.calledBy,
                    row.solvedStatus // Pass solvedStatus to addTableRow
                );
            });
        } catch (err) {
            console.error('Error loading check-in data:', err);
        }
    };

    const addCheckIn = async (room, checkInTime) => {
        try {
            // Format the check-in time to ISO format
            const formattedCheckInTime = new Date(checkInTime).toISOString();
    
            // Send the check-in data to the server
            const response = await fetch('/api/checkins', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ room, checkInTime: formattedCheckInTime })
            });
    
            // Handle server errors
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server responded with ${response.status}: ${errorText}`);
            }
    
            // Parse the response JSON
            const data = await response.json();
    
            // Validate the received check-in time
            const checkInTimeFromServer = new Date(data.checkInTime);
            if (isNaN(checkInTimeFromServer.getTime())) {
                throw new Error(`Invalid Date returned from server: ${data.checkInTime}`);
            }
    
            // Add the row to the table
            addTableRow(room, checkInTimeFromServer, data.id); // Ensure 'data.id' is used if that is correct
    
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
            const diff = 10 * 60 * 1000 - (now - checkInTime); // 10 minutes in milliseconds
            if (diff <= 0) {
                clearInterval(interval);
                countdownCell.textContent = '00:00';
                if (!comments) {
                    callButton.disabled = false;
                }
            } else {
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                countdownCell.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);

        // Event listener for the call button
        callButton.addEventListener('click', () => {
            const calledBy = names[Math.floor(Math.random() * names.length)];
            calledByCell.textContent = calledBy;
            callButton.disabled = true;
            updateCheckIn(id, { calledBy });
        });

        // Event listener for the delete button
        deleteButton.addEventListener('click', () => {
            deleteCheckIn(id, row);
        });
    };

    // Function to update check-in data on the server
    const updateCheckIn = async (id, updates) => {
        try {
            await fetch(`/api/checkins/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            });
        } catch (err) {
            console.error('Error updating check-in:', err);
        }
    };

    // Initialize the page
    updateCurrentDayAndDate();
    loadCheckInData();

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

        const checkInTime = getAmsterdamTime(); // Use the function to get the current time
        addCheckIn(selectedRoom, checkInTime);

        // Set timer for remaining time until sound should play
        setTimeout(() => {
            alertSound.play(); // Play sound using Howler.js
        }, 600000); // 10 minutes in milliseconds
    });

    // Real-time updates with Socket.io
    const socket = io();
    socket.on('checkIns', (checkIns) => {
        tbody.innerHTML = ''; // Clear the table body
        checkedInRooms.clear(); // Clear the set of checked-in rooms
        checkIns.forEach(row => {
            addTableRow(
                row.room,
                new Date(row.checkInTime),
                row.id,
                row.comments,
                row.calledBy,
                row.solvedStatus // Pass solvedStatus to addTableRow
            );
        });
    });

    // Schedule PDF download at 23:55
    const schedulePdfDownload = () => {
        const now = new Date();
        const millisUntil2355 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 55, 0, 0) - now;

        if (millisUntil2355 > 0) {
            setTimeout(() => {
                generatePdf();
                scheduleRowDeletion(); // Schedule deletion 5 minutes later
                schedulePdfDownload(); // Reschedule for the next day
            }, millisUntil2355);
        } else {
            schedulePdfDownload(); // If it's already past 23:55, schedule for the next day
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
});
