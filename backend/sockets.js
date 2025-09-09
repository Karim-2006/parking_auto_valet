module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });

    const { getDashboardData } = require('./services/whatsappService');

    // Emit initial dashboard data on connection
    getDashboardData().then(data => {
      socket.emit('dashboardUpdate', data);
    });

    // Handle requests for dashboard data
    socket.on('requestDashboardData', async () => {
      socket.emit('dashboardUpdate', await getDashboardData());
    });
  });
};