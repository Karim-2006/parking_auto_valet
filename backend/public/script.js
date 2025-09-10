document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    const slotsOverview = document.getElementById('slots-overview');
    const driversOverview = document.getElementById('drivers-overview');
    const parkedCarsTableBody = document.querySelector('#parked-cars-table tbody');
    const logsContainer = document.getElementById('logs-container');

    socket.on('dashboardUpdate', (data) => {
        console.log('Dashboard update received:', data);
        updateSlots(data.slots);
        updateDrivers(data.drivers);
        updateParkedCars(data.parkedCars);
        updateLogs(data.logs);
    });

    function updateSlots(slots) {
        slotsOverview.innerHTML = '';
        slots.forEach(slot => {
            const slotItem = document.createElement('div');
            slotItem.classList.add('slot-item');
            slotItem.classList.add(slot.isOccupied ? 'occupied' : 'free');
            slotItem.textContent = `Slot ${slot.slotNumber}: ${slot.isOccupied ? 'Occupied' : 'Free'}`;
            slotsOverview.appendChild(slotItem);
        });
    }

    function updateDrivers(drivers) {
        driversOverview.innerHTML = '';
        drivers.forEach(driver => {
            const driverItem = document.createElement('div');
            driverItem.classList.add('driver-item');
            driverItem.classList.add(driver.status === 'free' ? 'free' : 'busy');
            driverItem.textContent = `${driver.name}: ${driver.status}`;
            driversOverview.appendChild(driverItem);
        });
    }

    function updateParkedCars(parkedCars) {
        parkedCarsTableBody.innerHTML = '';
        parkedCars.forEach(car => {
            const row = parkedCarsTableBody.insertRow();
            row.insertCell().textContent = car.ownerName;
            row.insertCell().textContent = car.numberPlate;
            row.insertCell().textContent = car.carModel;
            row.insertCell().textContent = car.slot ? car.slot.slotNumber : 'N/A';
            row.insertCell().textContent = car.driver ? car.driver.name : 'N/A';
            row.insertCell().textContent = car.checkInTime ? new Date(car.checkInTime).toLocaleString() : 'N/A';
            row.insertCell().textContent = car.status;
        });
    }

    function updateLogs(logs) {
        logsContainer.innerHTML = '';
        logs.forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.classList.add('log-entry');
            logEntry.innerHTML = `<strong>${new Date(log.timestamp).toLocaleString()}:</strong> ${log.action} ${log.car ? `(Car: ${log.car.numberPlate})` : ''} ${log.driver ? `(Driver: ${log.driver.name})` : ''}`;
            logsContainer.prepend(logEntry); // Add new logs at the top
        });
    }

    // Initial data fetch (optional, if you want to load data on page load)
    // You might want to add an API endpoint to fetch initial data
    // For now, it relies on the server sending the first update via socket.io
});