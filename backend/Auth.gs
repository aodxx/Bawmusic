/**
 * Auth.gs
 * Handles login and session/token verification.
 * Roles: admin, manager, staff, readonly (see SECURITY in the master spec).
 */

function authLogin(email, password) {
  const users = dbList('USERS');
  const user = users.find(u => u.email === email && u.status !== 'inactive');
  if (!user) throw new Error('ไม่พบผู้ใช้งานนี้ หรือถูกปิดใช้งาน');
  if (user.password !== simpleHash(password)) throw new Error('รหัสผ่านไม่ถูกต้อง');

  const token = createToken(user.id);
  auditLog('login', { userId: user.id });
  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

function authMe(token) {
  const userId = verifyToken(token);
  if (!userId) throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
  const user = dbGet('USERS', userId);
  if (!user) throw new Error('ไม่พบผู้ใช้งาน');
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

/**
 * Role-gate helper. Call at the top of a sensitive action handler:
 *   requireRole(token, ['admin','manager']);
 * Throws if the caller's role is not in the allowed list.
 * NOTE: for a simple single-band setup, most actions skip this and only
 * require a valid token (see API.gs). Tighten as needed for multi-user teams.
 */
function requireRole(token, allowedRoles) {
  const userId = verifyToken(token);
  if (!userId) throw new Error('กรุณาเข้าสู่ระบบ');
  const user = dbGet('USERS', userId);
  if (!user || allowedRoles.indexOf(user.role) === -1) {
    throw new Error('คุณไม่มีสิทธิ์ทำรายการนี้');
  }
  return user;
}
