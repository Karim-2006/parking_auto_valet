const socket = io();

// DOM Elements
const availableSlotsEl = document.getElementById('available-slots');
const busyDriversEl = document.getElementById('busy-drivers');
const pendingCheckinsEl = document.getElementById('pending-checkins');
const awaitingRetrievalEl = document.getElementById('awaiting-retrieval');
const carsTableBody = document.querySelector('#cars-table tbody');
const driversTableBody = document.querySelector('#drivers-table tbody'); // Selector fixed
const logsTableBody = document.querySelector('#logs-table tbody');

// Function to update dashboard stats
const updateStats = (stats) => {
    availableSlotsEl.textContent = `${stats.availableSlots}/${stats.totalSlots}`;
    busyDriversEl.textContent = stats.busyDrivers;
    pendingCheckinsEl.textContent = stats.pendingCheckins;
    awaitingRetrievalEl.textContent = stats.awaitingRetrieval;
};

// Function to update cars table
const updateCarsTable = (cars) => {
    carsTableBody.innerHTML = ''; // Clear existing rows
    cars.forEach(car => {
        const row = carsTableBody.insertRow();
        row.innerHTML = `
            <td>${car.numberPlate}</td>
            <td>${car.model}</td>
            <td>${car.ownerName}</td>
            <td>${car.ownerPhone}</td>
            <td>${car.slot ? car.slot.slotNumber : 'N/A'}</td>
            <td>${car.driver ? car.driver.name : 'N/A'}</td>
            <td class="status-${car.status}">${car.status}</td>
            <td>${car.photoURL ? `<a href="${car.photoURL}" target="_blank"><img src="${car.photoURL}" alt="Car Photo" class="car-photo"></a>` : 'N/A'}</td>
            <td>${car.checkInTime ? new Date(car.checkInTime).toLocaleString() : 'N/A'}</td>
            <td>${car.retrievalTime ? new Date(car.retrievalTime).toLocaleString() : 'N/A'}</td>
        `;
    });
};

// Function to update drivers table
function updateDriversTable(drivers) {
  console.log('Received drivers for dashboard:', drivers); // Add this line

  driversTableBody.innerHTML = ''; // Clear existing rows

  drivers.forEach(driver => {
    const row = driversTableBody.insertRow();
    row.insertCell(0).textContent = driver.name;
    row.insertCell(1).textContent = driver.phone;
    const statusCell = row.insertCell(2);
    statusCell.textContent = driver.status;
    statusCell.className = `status-${driver.status.toLowerCase()}`;
  });
}

// Function to update logs table
const updateLogsTable = (logs) => {
    logsTableBody.innerHTML = ''; // Clear existing rows
    logs.forEach(log => {
        const row = logsTableBody.insertRow();
        row.innerHTML = `
            <td>${new Date(log.timestamp).toLocaleString()}</td>
            <td>${log.action}</td>
            <td>${log.car ? log.car.numberPlate : 'N/A'}</td>
            <td>${log.driver ? log.driver.name : 'N/A'}</td>
        `;
    });
};

// Socket.IO event listeners
socket.on('dashboardUpdate', (data) => {
    console.log('Dashboard update received:', data);
    updateStats(data.stats);
    updateCarsTable(data.cars);
    updateDriversTable(data.drivers);
    updateLogsTable(data.logs);
});

// Request initial data when connected
socket.on('connect', () => {
    console.log('Connected to Socket.IO server');
    socket.emit('requestDashboardData');
});

// Add smooth scrolling for navigation
document.querySelectorAll('.main-nav a').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});