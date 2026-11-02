# Roles & Permissions

Krikkit uses [Krikkit ability registry](https://github.com/spatie/laravel-permission) for fine-grained access control.

**Location:** Dashboard → **Admin** → **Roles**  
**URL:** `/dashboard/roles`  
**Permission:** `roles.browse`

## Default admin role

The seeded **admin** role receives all permissions and cannot be deleted. System role names are locked on edit.

## Create a role

1. **Roles** → **Create role**
2. Enter a **role name**
3. Enable permission groups as needed:
   - Dashboard, Users, Roles, Builders, Credits, Packs
   - Pages, Blogs, Subscriptions, Payment gateways, Languages
   - AI providers
4. Save

## Permission groups

| Group | Typical use |
|-------|-------------|
| Dashboard | Access admin overview |
| Users | List, create, update, delete users |
| Roles | Manage roles and permission assignments |
| Builders | View and activate Lab console |
| Credits | View balances and grant/debit credits |
| Packs | Manage subscription plans |
| Pages / Blogs | CMS content |
| Subscriptions | View subscription records |
| Payment gateways | View and update Stripe/PayPal |
| Languages | Manage locales and translation files |
| AI providers | Configure API keys and models |

## Edit or delete

- Edit a role to add or remove permissions; existing users with that role pick up changes on next request.
- Roles assigned to users cannot be deleted until users are reassigned.
- The **admin** system role cannot be removed.

---
