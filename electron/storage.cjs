const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const statuses = new Set(['In progress', 'Awaiting approval', 'Waiting for parts', 'Ready for pickup', 'Completed']);
const text = value => typeof value === 'string' && value.length <= 10000;
const amount = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
function validateData(data) {
  if (!data || !['repairs', 'parts', 'customers'].every(key => Array.isArray(data[key]) && data[key].length <= 50000)) return false;
  const ids = new Set();
  return data.repairs.every(r => r && /^RD-\d+$/.test(r.id) && !ids.has(r.id) && ids.add(r.id) &&
    ['customer', 'device', 'issue', 'technician', 'date'].every(k => text(r[k])) && r.technician.trim() &&
    statuses.has(r.status) && amount(r.cost)) &&
    data.parts.every(p => p && ['name', 'sku'].every(k => text(p[k])) && ['stock', 'minimum', 'price'].every(k => amount(p[k]))) &&
    data.customers.every(c => c && ['name', 'email', 'phone'].every(k => text(c[k])));
}
function dataDirectory() {
  if (process.env.REPAIRDESK_DATA_DIR) return path.resolve(process.env.REPAIRDESK_DATA_DIR);
  const base = process.platform === 'win32' ? (process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'))
    : process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support')
      : (process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'));
  return path.join(base, 'RepairDesk Offline', 'shared-data');
}
class Store {
  constructor(directory = dataDirectory()) {
    this.directory = directory;
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    this.file = path.join(directory, 'workshop.json');
    this.lock = path.join(directory, 'workshop.lock');
    this.id = crypto.createHash('sha256').update(path.resolve(directory)).digest('hex');
    try { this.acquire(); this.read(); } catch (error) { this.close(); throw error; }
  }
  acquire() {
    try {
      const fd = fs.openSync(this.lock, 'wx', 0o600);
      this.ownsLock = true;
      fs.writeFileSync(fd, String(process.pid));
      fs.closeSync(fd);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const pid = Number(fs.readFileSync(this.lock, 'utf8'));
      if (!Number.isInteger(pid) || pid <= 0) throw Error('Invalid storage lock. Check the data folder before recovering it.');
      try { process.kill(pid, 0); } catch (check) {
        if (check.code === 'ESRCH') { fs.unlinkSync(this.lock); return this.acquire(); }
        throw check;
      }
      throw Error('The shared data folder is already in use. Connect to the existing RepairDesk service.');
    }
  }
  read() {
    let value;
    try { value = JSON.parse(fs.readFileSync(this.file, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return { revision: 0, data: null }; throw Error('Shared data could not be read. Preserve workshop.json and restore a backup.', { cause: error }); }
    if (!Number.isSafeInteger(value.revision) || value.revision < 1 || !validateData(value.data)) throw Error('Shared data is invalid. Restore a backup; it has not been replaced.');
    return value;
  }
  write(data, revision) {
    if (!validateData(data)) return { status: 400, error: 'Invalid workshop data.' };
    const current = this.read();
    if (revision !== current.revision) return { status: 409, error: 'Records changed in another window. Reloaded the latest records; please retry your edit.' };
    const next = { revision: current.revision + 1, data };
    if (current.data) this.atomicWrite(this.file + '.previous', JSON.stringify(current));
    this.atomicWrite(this.file, JSON.stringify(next));
    return { status: 200, ...next };
  }
  atomicWrite(file, contents) {
    const temporary = file + '.tmp-' + crypto.randomUUID();
    let fd;
    try {
      fd = fs.openSync(temporary, 'wx', 0o600);
      fs.writeFileSync(fd, contents); fs.fsyncSync(fd); fs.closeSync(fd); fd = undefined;
      fs.renameSync(temporary, file);
    } finally { if (fd !== undefined) fs.closeSync(fd); fs.rmSync(temporary, { force: true }); }
  }
  close() { if (this.ownsLock) { fs.unlinkSync(this.lock); this.ownsLock = false; } }
}
module.exports = { Store, dataDirectory, validateData };
