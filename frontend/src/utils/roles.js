export const ROLES = {
  ADMIN:        'admin',
  TEACHER:      'teacher',
  RECEPTIONIST: 'receptionist',
  CLIENT:       'client',
}

export const HOME_BY_ROLE = {
  [ROLES.ADMIN]:        '/admin',
  [ROLES.TEACHER]:      '/teacher',
  [ROLES.RECEPTIONIST]: '/receptionist',
  [ROLES.CLIENT]:       '/client',
}
