/** Todas las claves de Redis en un único sitio. */
const P = "moren";

export const keys = {
  prefix: `${P}:`,
  settings: `${P}:settings`,
  weekly: `${P}:schedule:weekly`,
  exceptions: `${P}:schedule:exceptions`, // hash fecha → ScheduleException
  blocks: `${P}:blocks`, // hash id → Block
  closures: `${P}:closures`, // hash id → Closure
  servicesIdx: `${P}:services`, // zset id (score = orden)
  service: (id: string) => `${P}:service:${id}`,
  booking: (id: string) => `${P}:booking:${id}`,
  bookingsAll: `${P}:bookings:all`, // zset (score = fecha*10000+minutos)
  bookingsByDate: (date: string) => `${P}:bookings:date:${date}`,
  bookingsByCustomer: (cid: string) => `${P}:bookings:customer:${cid}`,
  bookingsByStatus: (s: string) => `${P}:bookings:status:${s}`,
  /** Bloqueo atómico de cada tramo de 15 min: valor = id de la reserva */
  slot: (date: string, minutes: number) => `${P}:slot:${date}:${minutes}`,
  customer: (id: string) => `${P}:customer:${id}`,
  customerByEmail: (email: string) => `${P}:customer:email:${email}`,
  customersAll: `${P}:customers`,
  admin: (username: string) => `${P}:admin:${username.toLowerCase()}`,
  session: (hash: string) => `${P}:session:${hash}`,
  magic: (hash: string) => `${P}:magic:${hash}`,
  rate: (name: string) => `${P}:rl:${name}`,
  image: (id: string) => `${P}:img:${id}`,
  backup: (stamp: string) => `${P}:backup:${stamp}`,
  backupsIdx: `${P}:backups`,
};

/** Prefijos que NO se incluyen en las copias de seguridad (efímeros) */
export const EPHEMERAL_PREFIXES = [`${P}:slot:`, `${P}:session:`, `${P}:magic:`, `${P}:rl:`, `${P}:backup:`];
