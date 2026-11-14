import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import { createAdminUser, ensureDefaultRoles, toggleAdminActive, updateAdminRole } from './actions'

export default async function AdminsPage() {
  await requireAdmin(PERMISSIONS.ADMINS_MANAGE)
  await ensureDefaultRoles()
  const [admins, roles] = await Promise.all([
    prisma.adminUser.findMany({ include: { role: true }, orderBy: { createdAt: 'desc' } }),
    prisma.adminRole.findMany({ orderBy: { name: 'asc' } }),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">مدیران سیستم</h1>
      <form action={createAdminUser} className="admin-card grid max-w-xl gap-3 p-4">
        <input name="name" placeholder="نام" className="admin-input" required />
        <input name="email" type="email" placeholder="email" className="admin-input" dir="ltr" required />
        <input name="password" type="password" placeholder="رمز (حداقل ۸)" className="admin-input" required />
        <select name="roleId" className="admin-input" required defaultValue="">
          <option value="" disabled>
            نقش
          </option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.slug})
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-[#e10600] px-4 py-2 text-sm">
          ایجاد مدیر
        </button>
      </form>
      <div className="admin-card overflow-x-auto">
        <table className="admin-table w-full">
          <thead>
            <tr>
              <th>نام</th>
              <th>ایمیل</th>
              <th>نقش</th>
              <th>وضعیت</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td dir="ltr">{a.email}</td>
                <td>
                  <form action={updateAdminRole.bind(null, a.id)} className="flex items-center gap-1">
                    <select name="roleId" defaultValue={a.roleId} className="admin-input text-xs">
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="text-xs text-[#e10600]">
                      نقش
                    </button>
                  </form>
                </td>
                <td>{a.isActive ? 'فعال' : 'غیرفعال'}</td>
                <td>
                  <form action={toggleAdminActive.bind(null, a.id)}>
                    <button type="submit" className="text-xs text-[#e10600]">
                      {a.isActive ? 'غیرفعال' : 'فعال'}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}