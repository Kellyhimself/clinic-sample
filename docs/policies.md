[
  {
    "policy_name": "System admins can manage admin roles",
    "table_name": "admin_roles",
    "command": "ALL",
    "applicable_roles": "{authenticated}",
    "policy_condition": "(EXISTS ( SELECT 1\n   FROM admin_roles admin_roles_1\n  WHERE ((admin_roles_1.user_id = auth.uid()) AND (admin_roles_1.admin_type = 'system'::admin_type))))",
    "check_condition": null
  },
  {
    "policy_name": "System admins can view all admin roles",
    "table_name": "admin_roles",
    "command": "SELECT",
    "applicable_roles": "{authenticated}",
    "policy_condition": "(EXISTS ( SELECT 1\n   FROM admin_roles admin_roles_1\n  WHERE ((admin_roles_1.user_id = auth.uid()) AND (admin_roles_1.admin_type = 'system'::admin_type))))",
    "check_condition": null
  },
  {
    "policy_name": "tenant_isolation_appointments",
    "table_name": "appointments",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "(tenant_id = get_tenant_id())",
    "check_condition": null
  },
  {
    "policy_name": "tenant_isolation_audit_logs",
    "table_name": "audit_logs",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "(tenant_id = get_tenant_id())",
    "check_condition": null
  },
  {
    "policy_name": "doctors_all",
    "table_name": "doctors",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "true",
    "check_condition": null
  },
  {
    "policy_name": "tenant_isolation_doctors",
    "table_name": "doctors",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "(tenant_id = get_tenant_id())",
    "check_condition": null
  },
  {
    "policy_name": "guest_patients_insert_public",
    "table_name": "guest_patients",
    "command": "INSERT",
    "applicable_roles": "{public}",
    "policy_condition": null,
    "check_condition": "true"
  },
  {
    "policy_name": "guest_patients_select",
    "table_name": "guest_patients",
    "command": "SELECT",
    "applicable_roles": "{public}",
    "policy_condition": "true",
    "check_condition": null
  },
  {
    "policy_name": "guest_patients_update",
    "table_name": "guest_patients",
    "command": "UPDATE",
    "applicable_roles": "{public}",
    "policy_condition": "((((auth.jwt() -> 'role'::text))::text = ANY (ARRAY['\"admin\"'::text, '\"staff\"'::text, '\"service_role\"'::text])) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))",
    "check_condition": null
  },
  {
    "policy_name": "tenant_isolation_guest_patients",
    "table_name": "guest_patients",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "(tenant_id = get_tenant_id())",
    "check_condition": null
  },
  {
    "policy_name": "Anyone can read valid tokens",
    "table_name": "invitation_tokens",
    "command": "SELECT",
    "applicable_roles": "{public}",
    "policy_condition": "(expires_at > now())",
    "check_condition": null
  },
  {
    "policy_name": "tenant_isolation_medical_records",
    "table_name": "medical_records",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "(tenant_id = get_tenant_id())",
    "check_condition": null
  },
  {
    "policy_name": "Access through medications tenant isolation",
    "table_name": "medication_batches",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "(EXISTS ( SELECT 1\n   FROM medications\n  WHERE ((medications.id = medication_batches.medication_id) AND (medications.tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid))))",
    "check_condition": null
  },
  {
    "policy_name": "Tenant isolation for medication batches",
    "table_name": "medication_batches",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "(tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid)",
    "check_condition": null
  },
  {
    "policy_name": "tenant_isolation_medication_batches",
    "table_name": "medication_batches",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "(tenant_id = get_tenant_id())",
    "check_condition": null
  },
  {
    "policy_name": "tenant_isolation_medications",
    "table_name": "medications",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "(tenant_id = get_tenant_id())",
    "check_condition": null
  },
  {
    "policy_name": "Allow admins to delete",
    "table_name": "patients",
    "command": "DELETE",
    "applicable_roles": "{authenticated}",
    "policy_condition": "(EXISTS ( SELECT 1\n   FROM profiles\n  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = 'admin'::text))))",
    "check_condition": null
  },
  {
    "policy_name": "Allow admins to update",
    "table_name": "patients",
    "command": "UPDATE",
    "applicable_roles": "{authenticated}",
    "policy_condition": "(EXISTS ( SELECT 1\n   FROM profiles\n  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = 'admin'::text))))",
    "check_condition": null
  },
  {
    "policy_name": "Allow auth to insert patients",
    "table_name": "patients",
    "command": "INSERT",
    "applicable_roles": "{authenticated}",
    "policy_condition": null,
    "check_condition": "(id = auth.uid())"
  },
  {
    "policy_name": "Allow insert for authenticated users",
    "table_name": "patients",
    "command": "INSERT",
    "applicable_roles": "{authenticated}",
    "policy_condition": null,
    "check_condition": "(id = auth.uid())"
  },
  {
    "policy_name": "Allow select for own data",
    "table_name": "patients",
    "command": "SELECT",
    "applicable_roles": "{authenticated}",
    "policy_condition": "(id = auth.uid())",
    "check_condition": null
  },
  {
    "policy_name": "patients_all",
    "table_name": "patients",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "true",
    "check_condition": null
  },
  {
    "policy_name": "tenant_isolation_patients",
    "table_name": "patients",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "(tenant_id = get_tenant_id())",
    "check_condition": null
  },
  {
    "policy_name": "tenant_isolation_pharmacists",
    "table_name": "pharmacists",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "(tenant_id = get_tenant_id())",
    "check_condition": null
  },
  {
    "policy_name": "tenant_isolation_prescriptions",
    "table_name": "prescriptions",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "(tenant_id = get_tenant_id())",
    "check_condition": null
  },
  {
    "policy_name": "Allow auth to insert profiles",
    "table_name": "profiles",
    "command": "INSERT",
    "applicable_roles": "{authenticated}",
    "policy_condition": null,
    "check_condition": "true"
  },
  {
    "policy_name": "Allow auth trigger inserts to profiles",
    "table_name": "profiles",
    "command": "INSERT",
    "applicable_roles": "{authenticated,postgres}",
    "policy_condition": null,
    "check_condition": "true"
  },
  {
    "policy_name": "Authenticated users can read all profiles",
    "table_name": "profiles",
    "command": "SELECT",
    "applicable_roles": "{public}",
    "policy_condition": "(auth.role() = 'authenticated'::text)",
    "check_condition": null
  },
  {
    "policy_name": "Users can update their own profile",
    "table_name": "profiles",
    "command": "UPDATE",
    "applicable_roles": "{authenticated}",
    "policy_condition": "(auth.uid() = id)",
    "check_condition": "(auth.uid() = id)"
  },
  {
    "policy_name": "Users can view their own profile",
    "table_name": "profiles",
    "command": "SELECT",
    "applicable_roles": "{authenticated}",
    "policy_condition": "(auth.uid() = id)",
    "check_condition": null
  },
  {
    "policy_name": "tenant_isolation_profiles",
    "table_name": "profiles",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "((tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (id = auth.uid()))",
    "check_condition": null
  },
  {
    "policy_name": "tenant_isolation_purchase_order_items",
    "table_name": "purchase_order_items",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "(tenant_id = get_tenant_id())",
    "check_condition": null
  },
  {
    "policy_name": "tenant_isolation_purchase_orders",
    "table_name": "purchase_orders",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "(tenant_id = get_tenant_id())",
    "check_condition": null
  },
  {
    "policy_name": "tenant_isolation_receipts",
    "table_name": "receipts",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "(tenant_id = get_tenant_id())",
    "check_condition": null
  },
  {
    "policy_name": "tenant_isolation_sale_items",
    "table_name": "sale_items",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "(tenant_id = get_tenant_id())",
    "check_condition": null
  },
  {
    "policy_name": "sales_tenant_isolation",
    "table_name": "sales",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "(tenant_id = (current_setting('app.current_tenant_id'::text))::uuid)",
    "check_condition": "(tenant_id = (current_setting('app.current_tenant_id'::text))::uuid)"
  },
  {
    "policy_name": "Public can view services",
    "table_name": "services",
    "command": "SELECT",
    "applicable_roles": "{public}",
    "policy_condition": "true",
    "check_condition": null
  },
  {
    "policy_name": "tenant_isolation_services",
    "table_name": "services",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "(tenant_id = get_tenant_id())",
    "check_condition": null
  },
  {
    "policy_name": "Tenant admins can manage their invitations",
    "table_name": "staff_invitations",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "(tenant_id IN ( SELECT profiles.tenant_id\n   FROM profiles\n  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = 'admin'::text))))",
    "check_condition": null
  },
  {
    "policy_name": "tenant_isolation_stock_movements",
    "table_name": "stock_movements",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "(tenant_id = get_tenant_id())",
    "check_condition": null
  },
  {
    "policy_name": "tenant_isolation_subscription_invoices",
    "table_name": "subscription_invoices",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "(tenant_id = get_tenant_id())",
    "check_condition": null
  },
  {
    "policy_name": "tenant_isolation_subscription_limits",
    "table_name": "subscription_limits",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "((tenant_id = get_tenant_id()) OR (tenant_id IS NULL))",
    "check_condition": null
  },
  {
    "policy_name": "Allow admin write access to subscription plans",
    "table_name": "subscription_plans",
    "command": "ALL",
    "applicable_roles": "{authenticated}",
    "policy_condition": "(EXISTS ( SELECT 1\n   FROM profiles\n  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = 'admin'::text))))",
    "check_condition": null
  },
  {
    "policy_name": "Allow public read access to subscription plans",
    "table_name": "subscription_plans",
    "command": "SELECT",
    "applicable_roles": "{authenticated}",
    "policy_condition": "true",
    "check_condition": null
  },
  {
    "policy_name": "tenant_isolation_suppliers",
    "table_name": "suppliers",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "(tenant_id = get_tenant_id())",
    "check_condition": null
  },
  {
    "policy_name": "tenant_isolation_usage_stats",
    "table_name": "usage_stats",
    "command": "ALL",
    "applicable_roles": "{public}",
    "policy_condition": "(tenant_id = get_tenant_id())",
    "check_condition": null
  },
  {
    "policy_name": "Allow auth trigger inserts to users",
    "table_name": "users",
    "command": "INSERT",
    "applicable_roles": "{authenticated,postgres}",
    "policy_condition": null,
    "check_condition": "true"
  }
]