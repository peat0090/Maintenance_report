// รายชื่อ Users ทั้งหมดในระบบ — แก้ไขได้ตามต้องการ
export const USERS = [
  {
    id: 1,
    name: 'Mr.Puttiphong Buala',
    email: 'puttipong.peat@gmail.com',
    password: '1234',
    role: 'admin',
    section: null,           // admin เข้าได้ทุกแผนก
    avatar: 'ส',
  },
  {
    id: 3,
    name: 'Pitchayanan Thanawatsanti',
    email: 'Pitchayanan@mechatronics.com',
    password: '1234',
    role: 'planner',
    section: 'mechatronic',  // planner ดูได้เฉพาะแผนกที่รับผิดชอบ
    avatar: 'ป',
  },
  {
    id: 2,
    name: 'Prasit Mana',
    email: 'prasit@maintenance.com',
    password: '1234',
    role: 'manager',
    section: 'mechatronic',
    avatar: 'ว',
  },
  {
    id: 4,
    name: 'วิชัย สุขสันต์',
    email: 'wichai@maintenance.com',
    password: '1234',
    role: 'technician',
    section: 'mechanic',
    avatar: 'อ',
  },
  {
    id: 5,
    name: 'กมล รุ่งเรือง',
    email: 'kamon@maintenance.com',
    password: '1234',
    role: 'viewer',
    section: null,
    avatar: 'ก',
  },
  {
    id: 6,
    name: 'ตุ้งติ้ง',
    email: 'tungting@maintenance.com',
    password: '1234',
    role: 'technician',
    section: 'hydraulic',
    avatar: 'น',
  },

]