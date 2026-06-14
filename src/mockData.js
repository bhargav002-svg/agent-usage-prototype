// Mock dataset matching the spec narrative:
// 69 licensed users, lifetime pool of 5,000 interactions, ~40% consumed,
// a small cohort of heavy drivers and ~40 users who have never used the Agent.

export const TENANT = {
  name: 'Acme Corp',
  licensedSeats: 69,
  pool: 10000, // lifetime contractual pool, tenant-level
  budgetUSD: 5000, // dollar value of the pool — shown as primary metric on tile 2
  amberBand: 75, // % — display-only colour bands
  redBand: 90,
}

const FIRST = ['Aarav','Diya','Rohan','Priya','Kabir','Ananya','Vikram','Sneha','Arjun','Meera','Rahul','Isha','Karan','Nidhi','Sameer','Tanvi','Aditya','Pooja','Nikhil','Riya','Manish','Shreya','Varun','Kavya','Deepak','Anjali','Siddharth','Neha','Rajat','Divya','Amit','Swati','Gaurav','Ritika','Harsh','Payal','Mohit','Sakshi','Vivek','Juhi','Akash','Nisha','Tarun','Aditi','Yash','Komal','Pranav','Simran','Abhay','Lavanya','Naveen','Bhavna','Ashish','Kritika','Rohit','Madhuri','Sanjay','Vandana','Kunal','Preeti','Dev','Archana','Imran','Sonali','Farhan','Rachna','Vinay','Geeta','Suresh'].slice(0, 69)
const LAST = ['Sharma','Patel','Reddy','Iyer','Khan','Mehta','Nair','Gupta','Desai','Rao','Joshi','Bose','Kulkarni','Menon','Chopra','Saxena','Pillai','Bhat','Sinha','Verma']

export const GROUPS = [
  { group: 'Claims Ops', superGroup: 'Operations' },
  { group: 'Underwriting', superGroup: 'Operations' },
  { group: 'Finance Shared Services', superGroup: 'Corporate' },
  { group: 'HR Services', superGroup: 'Corporate' },
  { group: 'Customer Support', superGroup: 'Service Delivery' },
  { group: 'Tech Support L2', superGroup: 'Service Delivery' },
]

const ROLES = ['Analyst','Senior Analyst','Associate','Senior Associate','Manager','Senior Manager','Specialist','Lead','Consultant','Executive']
const LOCATIONS = ['Bangalore','Mumbai','Hyderabad','Chennai','Pune','Delhi']
const MANAGERS = ['Sunita Rajan','Arjun Pillai','Deepa Menon','Rajesh Iyer','Kavitha Nair']
const DEPARTMENTS = {
  'Claims Ops': 'Claims & Risk',
  'Underwriting': 'Risk & Underwriting',
  'Finance Shared Services': 'Finance',
  'HR Services': 'Human Resources',
  'Customer Support': 'Customer Experience',
  'Tech Support L2': 'Information Technology',
}

// Deterministic pseudo-random so the prototype renders the same numbers every load.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20260611)

// Usage window: 2026-01-15 (Agent go-live) to today (2026-06-11)
const GO_LIVE = new Date('2026-01-15')
const TODAY = new Date('2026-06-11')
const DAYS = Math.round((TODAY - GO_LIVE) / 86400000)

function dateStr(d) { return d.toISOString().slice(0, 10) }

// Cohorts: 12 power users, 17 light users, 40 never-used
export const USERS = FIRST.map((fn, i) => {
  const name = `${fn} ${LAST[i % LAST.length]}`
  const g = GROUPS[i % GROUPS.length]
  const employeeId = 'EMP-' + String(1001 + i).padStart(4, '0')
  const role = ROLES[i % ROLES.length]
  const department = DEPARTMENTS[g.group]
  const location = LOCATIONS[i % LOCATIONS.length]
  const manager = MANAGERS[i % MANAGERS.length]
  // date joined: between 2020-01-01 and go-live
  const joinBase = new Date('2020-01-01').getTime()
  const joinRange = GO_LIVE.getTime() - joinBase
  const dateJoined = dateStr(new Date(joinBase + Math.floor(rand() * joinRange)))
  let events = []
  if (i < 12) {
    // power users: 292–462 interactions spread across the window (pool ~91% consumed, red band)
    const total = 600 + Math.floor(rand() * 170)
    for (let n = 0; n < total; n++) {
      const d = new Date(GO_LIVE.getTime() + Math.floor(rand() * DAYS) * 86400000)
      events.push(dateStr(d))
    }
  } else if (i < 29) {
    // light users: 1–25 interactions, mostly earlier in the window (trailing off)
    const total = 1 + Math.floor(rand() * 25)
    for (let n = 0; n < total; n++) {
      const d = new Date(GO_LIVE.getTime() + Math.floor(rand() * rand() * DAYS) * 86400000)
      events.push(dateStr(d))
    }
  }
  events.sort()
  return {
    id: i + 1,
    name,
    email: `${fn.toLowerCase()}.${LAST[i % LAST.length].toLowerCase()}@acme.example`,
    employeeId,
    role,
    department,
    location,
    manager,
    dateJoined,
    group: g.group,
    superGroup: g.superGroup,
    events,
  }
})

export const GO_LIVE_STR = dateStr(GO_LIVE)
export const TODAY_STR = dateStr(TODAY)
