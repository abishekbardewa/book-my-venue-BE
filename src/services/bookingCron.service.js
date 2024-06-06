import cron from 'node-cron';
import { BookingService, PaymentService } from '.';
import { BOOKING_STATUS } from '@/constants/status.constant';

// Cron job to delete bookings pending payment after 15 minutes
cron.schedule('0 * * * *', async () => {
	console.log('CUSTOMER CRON running  every hour');
	// cron.schedule('*/1 * * * * *', async () => {
	// 	console.log('CUSTOMER CRON running every 10 sec');
	try {
		const currentTime = new Date();
		const fifteenMinutesAgo = new Date(currentTime.getTime() - 15 * 60 * 1000); // 15 minutes ago
		// const fifteenMinutesAgo = new Date(currentTime.getTime() - 1 * 60 * 1000); // 1 min
		console.log(currentTime, fifteenMinutesAgo);
		const expiredBookings = await BookingService.getExpiredBookings(fifteenMinutesAgo);
		console.log(expiredBookings);
		for (const booking of expiredBookings) {
			await BookingService.deleteBooking(booking.id);
		}

		console.log(`Checked for expired bookings pending payment at ${currentTime}`);
	} catch (error) {
		console.error('Error deleting expired bookings pending payment:', error);
	}
});

// Cron job to handle bookings awaiting owner action after one day
cron.schedule('0 * * * *', async () => {
	console.log('OWNER CRON running  every hour');
	// cron.schedule('*/1 * * * * *', async () => {
	// 	console.log('OWNER CRON running every 10 sec');
	try {
		const currentTime = new Date();
		const oneDayAgo = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000); // One day ago
		// const oneDayAgo = new Date(currentTime.getTime() - 1 * 60 * 1000);// 1 min

		const pendingOwnerActionBookings = await BookingService.getPendingOwnerActionBookings(oneDayAgo);
		console.log(pendingOwnerActionBookings);
		for (const booking of pendingOwnerActionBookings) {
			await BookingService.cancelAndRefund(booking.id);
		}

		console.log(`Checked for bookings awaiting owner action at ${currentTime}`);
	} catch (error) {
		console.error('Error handling bookings awaiting owner action:', error);
	}
});

// Cron job to to mark completed booking
cron.schedule('0 * * * *', async () => {
	console.log('COMPLETED Booking CRON running  every hour');
	// 	// cron.schedule('*/1 * * * * *', async () => {
	// 	// 	console.log('COMPLETED Booking CRON running every 10 sec');
	try {
		const now = new Date();
		const updatedBookings = await BookingService.updateCompletedBookings(now);
		console.log(`Completed status updated for ${updatedBookings.count} bookings`);
	} catch (error) {
		console.error('Error running cron job to update booking statuses:', error);
	}
});
