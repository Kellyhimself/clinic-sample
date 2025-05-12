# Clinic & Pharmacy Management System - SaaS Migration Roadmap

## Overview

This document outlines the process for converting our Clinic & Pharmacy Management System into a multi-tenant SaaS platform with subscription-based pricing. The goal is to create a scalable, secure service for Kenyan healthcare providers while maintaining data isolation an
d compliance.

## Target Audience

- Small clinics and pharmacies in Kenya
- Independent practitioners
- Healthcare facilities with limited IT resources
- Single-specialty facilities (pharmacy-only or clinic-only)

## Pricing Tiers

### Free Tier
- Limited to 50 patients
- 100 appointments/month
- Basic inventory management (50 items)
- Single user account
- No analytics
- Basic reports only

### Pro Tier (KES 2,000-5,000/month)
- Unlimited patients
- Unlimited appointments
- Full inventory management
- Up to 5 user accounts
- Basic analytics
- M-Pesa integration
- Email notifications
- Comprehensive reporting

### Enterprise Tier (KES 10,000+/month)
- Everything in Pro
- Multi-location support
- Unlimited user accounts
- Advanced analytics
- Custom integrations
- Priority support
- Data export capabilities
- API access

## Migration Roadmap

### Phase 1: Database Schema Changes

1. **Add Tenant Tables**
   - Create a new `tenants` table:
     ```sql
     CREATE TABLE tenants (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       name TEXT NOT NULL,
       plan_type TEXT NOT NULL DEFAULT 'free',
       subscription_id TEXT,
       subscription_status TEXT,
       created_at TIMESTAMPTZ DEFAULT NOW(),
       updated_at TIMESTAMPTZ DEFAULT NOW(),
       billing_email TEXT,
       billing_address TEXT,
       contact_person TEXT,
       contact_phone TEXT,
       max_users INTEGER DEFAULT 1,
       is_active BOOLEAN DEFAULT TRUE
     );
     ```

2. **Update Existing Tables**
   - Add `tenant_id` to all tables that store tenant-specific data:
     ```sql
     ALTER TABLE profiles ADD COLUMN tenant_id UUID REFERENCES tenants(id);
     ALTER TABLE patients ADD COLUMN tenant_id UUID REFERENCES tenants(id);
     ALTER TABLE appointments ADD COLUMN tenant_id UUID REFERENCES tenants(id);
     ALTER TABLE medications ADD COLUMN tenant_id UUID REFERENCES tenants(id);
     -- Continue for all tenant-specific tables
     ```

3. **Usage Limits Tables**
   - Create tables to track usage against subscription limits:
     ```sql
     CREATE TABLE subscription_limits (
       tenant_id UUID REFERENCES tenants(id),
       plan_type TEXT NOT NULL,
       max_patients INTEGER,
       max_appointments_per_month INTEGER,
       max_inventory_items INTEGER,
       max_users INTEGER,
       features JSONB,
       PRIMARY KEY (tenant_id)
     );
     
     CREATE TABLE usage_stats (
       tenant_id UUID REFERENCES tenants(id),
       month DATE NOT NULL,
       appointment_count INTEGER DEFAULT 0,
       patient_count INTEGER DEFAULT 0,
       inventory_count INTEGER DEFAULT 0,
       PRIMARY KEY (tenant_id, month)
     );
     ```

4. **Row Level Security (RLS)**
   - Implement RLS policies on all tables to ensure tenant isolation:
     ```sql
     ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
     CREATE POLICY tenant_isolation_policy ON profiles 
       USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
     
     -- Repeat for all tables with tenant_id
     ```

### Phase 2: Authentication & Authorization Updates

1. **Update Auth System**
   - Modify the authentication system to track tenant association
   - Update `/lib/authActions.ts` to include tenant context in all queries
   - Implement middleware to set tenant context in Supabase queries

2. **Tenant Management UI**
   - Create admin interface for tenant management
   - Implement tenant creation, update, and management workflows
   - Add user invitation system for tenant admins to add users

3. **Role-Based Access Control**
   - Update existing RBAC to include tenant-specific permissions
   - Add tenant admin role with permissions to manage users within their tenant

### Phase 3: Subscription Management

1. **Stripe Integration**
   - Install required packages:
     ```bash
     npm install @stripe/stripe-js stripe
     ```
   - Create subscription products and price plans in Stripe dashboard
   - Implement Stripe Checkout for subscription signup/management

2. **M-Pesa Integration**
   - Integrate with Pesapal or Flutterwave for M-Pesa payments
   - Implement STK Push for subscription payments
   - Set up recurring billing through mobile money

3. **Subscription Management UI**
   - Create subscription management interface for tenants
   - Implement upgrade/downgrade workflows
   - Add billing history and invoice management

4. **Webhooks**
   - Implement Stripe webhooks to handle subscription lifecycle events
   - Create webhook handlers for payment confirmations, subscription updates, etc.
   - Update tenant status based on payment events

### Phase 4: Feature Segmentation by Tier
                                                                                                                                          
1. **Feature Flags System**
   - Implement a feature flagging system based on subscription tier
   - Update UI to conditionally render features based on subscription

2. **Usage Limits**
   - Add middleware to check usage against subscription limits
   - Implement graceful handling of limit-reached scenarios
   - Provide clear upgrade paths when limits are reached

3. **Analytics Segmentation**
   - Limit access to analytics features based on tier
   - Implement tiered reporting system

### Phase 5: Application Updates

1. **Update Components**
   - Modify all components to be tenant-aware
   - Update queries in components to respect tenant isolation
   - Add subscription status indicators and upgrade prompts

2. **API Endpoints**
   - Update API endpoints to include tenant context
   - Implement rate limiting based on subscription tier
   - Add validation middleware for tenant access

3. **Dashboard Enhancements**
   - Add subscription management to admin dashboard
   - Create usage dashboards for tenant admins
   - Implement limit indicators and warnings

### Phase 6: Security Enhancements

1. **Input Validation**
   - Strengthen input validation for all forms
   - Implement rate limiting for API endpoints
   - Add CSRF protection for all sensitive operations

2. **Data Isolation Testing**
   - Develop comprehensive tests for tenant data isolation
   - Create security audit protocols for regular testing
   - Implement monitoring for potential isolation breaches

3. **Compliance**
   - Ensure HIPAA compliance for patient data
   - Implement data retention policies
   - Create privacy notices and terms of service

### Phase 7: Deployment & Scaling

1. **Infrastructure Updates**
   - Configure Vercel for multi-tenant deployment
   - Set up Supabase connection pooling for better performance
   - Implement caching strategies for frequently accessed data

2. **Monitoring**
   - Set up monitoring for tenant usage patterns
   - Create alerts for abnormal usage or potential security issues
   - Implement performance monitoring for slow queries

3. **Backup Strategy**
   - Implement tenant-specific backup strategies
   - Set up disaster recovery procedures
   - Create data export functionality for tenants

## Implementation Plan

### Month 1: Database & Authentication
- Database schema changes
- RLS implementation
- Basic tenant management UI
- Authentication updates

### Month 2: Subscription System
- Stripe integration
- M-Pesa integration via Pesapal
- Subscription management UI
- Basic feature flagging

### Month 3: Feature Implementation
- Complete feature segmentation
- Usage tracking and limits
- UI updates for subscription tiers
- Testing and security auditing

### Month 4: Launch Preparation
- Comprehensive testing
- Documentation updates
- Marketing materials
- Staff training

## Technical Considerations

### Database Performance
- Monitor query performance with tenant filters
- Implement appropriate indexes on tenant_id columns
- Consider partitioning for large tenants

### Security
- Regular security audits for RLS policies
- Implement JWT validation with tenant claims
- Use prepared statements for all database queries

### Scalability
- Design for horizontal scaling
- Implement caching for frequently accessed data
- Consider read replicas for reporting queries

## Post-Launch Monitoring

- Track tenant acquisition and churn
- Monitor usage patterns to refine pricing tiers
- Track performance metrics for database queries
- Monitor Supabase and Stripe costs

## Compliance Considerations

- Ensure pricing complies with Kenya's Consumer Protection Act (2012)
- Implement appropriate data protection measures
- Create clear terms of service and privacy policies
- Include cancellation policies in line with local regulations
