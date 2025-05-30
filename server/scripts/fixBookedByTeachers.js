// server/scripts/fixBookedByTeachers.js

const mongoose = require('mongoose');
const Teacher = require('../../models/teacher'); // تأكد من المسار الصحيح
const Student = require('../../models/student'); // تأكد من المسار الصحيح
const Session = require('../../models/session'); // تأكد من المسار الصحيح
require('dotenv').config({ path: './.env' }); // تأكد من المسار الصحيح لملف .env

const fixTeacherBookedBy = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB for fixing bookedBy field.');

        const teachers = await Teacher.find({});
        let teachersUpdatedCount = 0;
        let slotsFixedCount = 0;

        for (const teacher of teachers) {
            let teacherChanged = false;
            const updatedAvailableTimeSlots = [];

            for (const slot of teacher.availableTimeSlots) {
                const newSlot = { ...slot._doc }; // Create a copy to modify

                if (newSlot.isBooked) {
                    // If it's booked, check if bookedBy is missing or invalid
                    if (!newSlot.bookedBy || !mongoose.Types.ObjectId.isValid(newSlot.bookedBy)) {
                        console.log(`Teacher ${teacher.name} (ID: ${teacher._id}): Found booked slot with missing/invalid bookedBy: ${newSlot.dayOfWeek} ${newSlot.timeSlot}`);

                        // Try to find a recent scheduled session for this slot
                        // We look for a 'مجدولة' (scheduled) session for this teacher, day, and time slot.
                        // Assuming that a booked slot means there should be a scheduled session.
                        const correspondingSession = await Session.findOne({
                            teacherId: teacher._id,
                            dayOfWeek: newSlot.dayOfWeek,
                            timeSlot: newSlot.timeSlot,
                            status: 'مجدولة' // Look for actively scheduled sessions
                        }).sort({ date: -1 }); // Get the most recent one

                        if (correspondingSession && correspondingSession.studentId) {
                            newSlot.bookedBy = correspondingSession.studentId;
                            teacherChanged = true;
                            slotsFixedCount++;
                            console.log(`  -> Fixed: Assigned student ${correspondingSession.studentId} to slot.`);
                        } else {
                            // If no corresponding session found, it's an inconsistency.
                            // You might choose to un-book the slot or log it as an error.
                            // For now, we'll log it and keep it booked but without a student.
                            console.warn(`  -> Warning: Could not find corresponding session for booked slot. Consider un-booking it manually: Teacher ${teacher.name}, Slot ${newSlot.dayOfWeek} ${newSlot.timeSlot}`);
                        }
                    }
                } else {
                    // If not booked, ensure bookedBy is null
                    if (newSlot.bookedBy !== null) {
                        newSlot.bookedBy = null;
                        teacherChanged = true;
                    }
                }
                updatedAvailableTimeSlots.push(newSlot);
            }

            if (teacherChanged) {
                teacher.availableTimeSlots = updatedAvailableTimeSlots;
                await teacher.save();
                teachersUpdatedCount++;
                console.log(`Teacher ${teacher.name} saved after update.`);
            }
        }

        console.log(`\nFixing complete. Total teachers updated: ${teachersUpdatedCount}. Total slots fixed: ${slotsFixedCount}.`);

    } catch (error) {
        console.error('Error during database fixing script:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
};

fixTeacherBookedBy();