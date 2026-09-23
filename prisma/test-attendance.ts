import {
  dateToTimeString,
  calculateStatus,
  calculateWorkDuration,
} from '../lib/attendance/helpers'

// Test 1: Shift malam 23:00-06:00, absen masuk 22:55 (lebih awal)
console.log('=== Test 1: Shift Malam, Absen Lebih Awal ===')
const shiftStart = new Date('2026-09-23T16:00:00.000Z') // 23:00 WIB
const checkIn = new Date('2026-09-23T15:55:00.000Z') // 22:55 WIB

console.log('std:', dateToTimeString(shiftStart))
console.log('in :', dateToTimeString(checkIn))
console.log(
  'status:',
  calculateStatus({
    checkInTime: checkIn,
    standardCheckIn: shiftStart,
    lateToleranceMinutes: 15,
  }),
)
console.log()

// Test 2: Shift malam, absen masuk 23:05 (telat 5 menit)
console.log('=== Test 2: Shift Malam, Telat 5 Menit ===')
const checkIn2 = new Date('2026-09-23T16:05:00.000Z') // 23:05 WIB

console.log('std:', dateToTimeString(shiftStart))
console.log('in :', dateToTimeString(checkIn2))
console.log(
  'status:',
  calculateStatus({
    checkInTime: checkIn2,
    standardCheckIn: shiftStart,
    lateToleranceMinutes: 15,
  }),
)
console.log()

// Test 3: Shift malam, absen masuk 23:30 (telat 30 menit)
console.log('=== Test 3: Shift Malam, Telat 30 Menit ===')
const checkIn3 = new Date('2026-09-23T16:30:00.000Z') // 23:30 WIB

console.log(
  'status:',
  calculateStatus({
    checkInTime: checkIn3,
    standardCheckIn: shiftStart,
    lateToleranceMinutes: 15,
  }),
)
console.log()

// Test 4: Shift malam, absen masuk 00:30 (besoknya, telat 90 menit)
console.log('=== Test 4: Shift Malam, Absen Besoknya 00:30 ===')
const checkIn4 = new Date('2026-09-23T17:30:00.000Z') // 00:30 WIB besoknya

console.log('std:', dateToTimeString(shiftStart))
console.log('in :', dateToTimeString(checkIn4))
console.log(
  'status:',
  calculateStatus({
    checkInTime: checkIn4,
    standardCheckIn: shiftStart,
    lateToleranceMinutes: 15,
  }),
)
console.log()

// Test 5: Durasi kerja — shift malam 23:00-06:00, absen 22:55-07:00
console.log('=== Test 5: Durasi Kerja Shift Malam ===')
const shiftEnd = new Date('2026-09-23T23:00:00.000Z') // 06:00 WIB besoknya
const checkOut = new Date('2026-09-23T23:55:00.000Z') // 06:55 WIB besoknya

console.log(
  'duration:',
  calculateWorkDuration({
    checkIn,
    checkOut,
    standardCheckOut: shiftEnd,
  }),
)