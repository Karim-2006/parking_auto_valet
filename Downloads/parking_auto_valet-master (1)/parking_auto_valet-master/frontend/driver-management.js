document.addEventListener('DOMContentLoaded', function() {
    const apiUrl = 'http://localhost:3000/api'; // Adjust if your backend URL is different

    const addDriverForm = document.getElementById('add-driver-form');
    const driverList = document.getElementById('driver-list').getElementsByTagName('tbody')[0];
    const carSelect = document.getElementById('car-select');
    const driverSelect = document.getElementById('driver-select');
    const manualAssignmentForm = document.getElementById('manual-assignment-form');
    const assignmentHistoryTable = document.getElementById('assignment-history').getElementsByTagName('tbody')[0];
    const scanResult = document.getElementById('scan-result');
    const performanceChartCtx = document.getElementById('performance-chart').getContext('2d');
    let performanceChart;

    // --- Data Fetching ---
    async function fetchData(endpoint) {
        try {
            const response = await fetch(`${apiUrl}/${endpoint}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Could not fetch ${endpoint}:`, error);
            return [];
        }
    }

    async function postData(endpoint, data) {
        try {
            const response = await fetch(`${apiUrl}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Could not post to ${endpoint}:`, error);
            return null;
        }
    }

    // --- QR Code Scanner ---
    function onScanSuccess(decodedText, decodedResult) {
        console.log(`Code matched = ${decodedText}`, decodedResult);
        scanResult.textContent = `Scanned: ${decodedText}`;
        // Example: "qr_scan:TOKEN:CAR_ID:OWNER_PHONE"
        // You can now parse this and send it to the backend
        // postData('scan', { qrData: decodedText });
        html5QrcodeScanner.clear();
    }

    function onScanFailure(error) {
        // console.warn(`Code scan error = ${error}`);
    }

    let html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 250 });
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);

    // --- Rendering Functions ---
    function renderDrivers(drivers) {
        driverList.innerHTML = '';
        drivers.forEach(driver => {
            const row = driverList.insertRow();
            row.innerHTML = `
                <td>${driver.name}</td>
                <td>${driver.phone || 'N/A'}</td>
                <td>${driver.licenseNumber || 'N/A'}</td>
                <td>${driver.status}</td>
                <td><button onclick="alert('Edit functionality to be implemented.')">Edit</button></td>
            `;
        });
    }

    function updateCarSelect(cars) {
        carSelect.innerHTML = '<option value="">Select a Car</option>';
        cars.filter(c => c.status === 'pending' || c.status === 'checked_in').forEach(car => {
            const option = document.createElement('option');
            option.value = car._id;
            option.textContent = `${car.numberPlate} (${car.model})`;
            carSelect.appendChild(option);
        });
    }

    function updateDriverSelect(drivers) {
        driverSelect.innerHTML = '<option value="">Select a Driver</option>';
        drivers.filter(d => d.status === 'free').forEach(driver => {
            const option = document.createElement('option');
            option.value = driver._id;
            option.textContent = driver.name;
            driverSelect.appendChild(option);
        });
    }

    function renderAssignmentHistory(logs) {
        assignmentHistoryTable.innerHTML = '';
        logs.filter(log => log.action.includes('Assigned') || log.action.includes('retrieved') || log.action.includes('parked'))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .forEach(log => {
                const row = assignmentHistoryTable.insertRow();
                row.innerHTML = `
                    <td>${log.car ? log.car.numberPlate : 'N/A'}</td>
                    <td>${log.driver ? log.driver.name : 'N/A'}</td>
                    <td>${new Date(log.timestamp).toLocaleString()}</td>
                    <td>${log.action}</td>
                `;
            });
    }

    function renderPerformanceAnalytics(drivers, logs) {
        const driverPerformance = drivers.map(driver => {
            const parkedCount = logs.filter(log => log.driver && log.driver._id === driver._id && log.action.includes('parked')).length;
            return { name: driver.name, count: parkedCount };
        });

        if (performanceChart) {
            performanceChart.destroy();
        }

        performanceChart = new Chart(performanceChartCtx, {
            type: 'bar',
            data: {
                labels: driverPerformance.map(d => d.name),
                datasets: [{
                    label: 'Number of Cars Parked',
                    data: driverPerformance.map(d => d.count),
                    backgroundColor: 'rgba(0, 86, 179, 0.5)',
                    borderColor: 'rgba(0, 86, 179, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    // --- Event Handlers ---
    addDriverForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newDriver = {
            name: document.getElementById('driver-name').value,
            phone: document.getElementById('contact-details').value,
            licenseNumber: document.getElementById('license-number').value,
            status: document.getElementById('availability-status').value,
        };
        
        const result = await postData('drivers', newDriver);
        if (result) {
            addDriverForm.reset();
            loadAllData(); // Refresh data
        }
    });

    manualAssignmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const carId = carSelect.value;
        const driverId = driverSelect.value;
        if (!carId || !driverId) {
            alert('Please select a car and a driver.');
            return;
        }
        
        const result = await postData('assign', { carId, driverId });
        if (result) {
            alert('Driver assigned successfully!');
            loadAllData(); // Refresh data
        } else {
            alert('Failed to assign driver.');
        }
    });

    // --- Initial Load ---
    async function loadAllData() {
        const [drivers, cars, logs] = await Promise.all([
            fetchData('drivers'),
            fetchData('cars'),
            fetchData('logs')
        ]);

        renderDrivers(drivers);
        updateCarSelect(cars);
        updateDriverSelect(drivers);
        renderAssignmentHistory(logs);
        renderPerformanceAnalytics(drivers, logs);
    }

    loadAllData();
});

