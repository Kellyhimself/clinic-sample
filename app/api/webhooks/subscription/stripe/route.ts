import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/payments/subscription/stripe";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature") || "";
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    if (!signature) {
      return NextResponse.json(
        { error: "No signature provided" },
        { status: 400 }
      );
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    console.log(`Processing webhook event: ${event.type}`, JSON.stringify(event.data.object, null, 2));
    const supabase = createAdminClient();

    try {
      // Handle the event
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const tenantId = session.metadata?.tenant_id;

          if (!tenantId) {
            throw new Error("No tenant_id found in session metadata");
          }

          // Get the line items from the checkout session to determine the price ID
          let priceId = "";
          try {
            if (session.metadata?.price_id) {
              priceId = session.metadata.price_id;
              console.log(`Using price ID from metadata: ${priceId}`);
            } else {
              const sessionWithLineItems = await stripe.checkout.sessions.retrieve(
                session.id,
                { expand: ['line_items'] }
              );
              
              if (sessionWithLineItems.line_items?.data.length) {
                priceId = sessionWithLineItems.line_items.data[0].price?.id || "";
                console.log(`Extracted price ID from line items: ${priceId}`);
              }
            }
          } catch (error) {
            console.error("Could not extract price from session:", error);
          }
          
          // Match the price ID to determine the plan
          let planType = "free";
          if (priceId === process.env.STRIPE_PRO_PLAN_PRICE_ID) {
            planType = "pro";
          } else if (priceId === process.env.STRIPE_ENTERPRISE_PLAN_PRICE_ID) {
            planType = "enterprise";
          }
          
          console.log(`Determined plan type: ${planType} for price ID: ${priceId}`);
          
          // Update tenant subscription directly
          const { error: updateError } = await supabase
            .from('tenants')
            .update({
              subscription_id: session.subscription as string,
              plan_type: planType,
              subscription_status: 'active',
              payment_method: 'stripe',
              customer_id: session.customer as string,
              subscription_start_date: new Date().toISOString(),
              subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
            })
            .eq('id', tenantId);
          
          if (updateError) {
            console.error("Error updating tenant:", updateError);
          } else {
            console.log("Tenant updated successfully");
          }

          // Update or insert subscription limits based on the plan
          const planLimits = {
            pro: {
              max_patients: 1000,
              max_appointments_per_month: 500,
              max_inventory_items: 1000,
              max_users: 10,
              max_transactions_per_month: 5000,
              features: {
                mpesa_integration: true,
                advanced_reporting: true,
                inventory_management: true,
                api_access: false
              }
            },
            enterprise: {
              max_patients: -1, // unlimited
              max_appointments_per_month: -1, // unlimited
              max_inventory_items: -1, // unlimited
              max_users: 50,
              max_transactions_per_month: -1, // unlimited
              features: {
                mpesa_integration: true,
                advanced_reporting: true,
                inventory_management: true,
                api_access: true,
                multi_location: true,
                custom_integrations: true
              }
            }
          };

          // Only update limits for paid plans
          if (planType !== "free") {
            const limits = planLimits[planType as keyof typeof planLimits];
            
            // Check if subscription_limits record exists
            const { data: existingLimits } = await supabase
              .from("subscription_limits")
              .select("id")
              .eq("tenant_id", tenantId)
              .maybeSingle();
              
            if (existingLimits) {
              // Update existing record
                const { error: limitsUpdateError } = await supabase
                .from("subscription_limits")
                .update({
                  plan_type: planType,
                  max_patients: limits.max_patients,
                  max_appointments_per_month: limits.max_appointments_per_month,
                  max_inventory_items: limits.max_inventory_items,
                  max_users: limits.max_users,
                  max_transactions_per_month: limits.max_transactions_per_month,
                  features: limits.features,
                  updated_at: new Date().toISOString()
                })
                .eq("tenant_id", tenantId);
                
                if (limitsUpdateError) {
                  console.error("Error updating subscription limits:", limitsUpdateError);
                } else {
                  console.log("Subscription limits updated successfully");
                }
            } else {
              // Insert new record
                const { error: limitsInsertError } = await supabase.from("subscription_limits").insert({
                tenant_id: tenantId,
                plan_type: planType,
                max_patients: limits.max_patients,
                max_appointments_per_month: limits.max_appointments_per_month,
                max_inventory_items: limits.max_inventory_items,
                max_users: limits.max_users,
                max_transactions_per_month: limits.max_transactions_per_month,
                features: limits.features
              });
              
                if (limitsInsertError) {
                  console.error("Error inserting subscription limits:", limitsInsertError);
                } else {
                  console.log("Subscription limits created successfully");
                }
              }
            }

            // Log the payment in audit_logs
            const { error: auditLogError } = await supabase.from("audit_logs").insert({
            action: "payment_completed",
              created_by: tenantId,
            entity_id: tenantId,
            entity_type: "tenant",
            tenant_id: tenantId,
            details: {
              amount: session.amount_total ? session.amount_total / 100 : 0,
              payment_method: "stripe",
              status: "completed",
              reference: session.id,
              payment_date: new Date().toISOString(),
              plan_type: planType
            }
          });
            
            if (auditLogError) {
              console.error("Error creating audit log:", auditLogError);
            } else {
              console.log("Audit log created successfully");
            }

          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          const tenantId = subscription.metadata?.tenant_id;

          if (!tenantId) {
            throw new Error("No tenant_id found in subscription metadata");
          }

          // Update tenant subscription directly
          const { error: updateError } = await supabase
            .from('tenants')
            .update({
              subscription_id: subscription.id,
              plan_type: subscription.metadata?.plan_type || 'free',
              subscription_status: subscription.status,
              payment_method: 'stripe',
              customer_id: subscription.customer as string,
              subscription_start_date: new Date(subscription.start_date * 1000).toISOString(),
              subscription_end_date: new Date((subscription.start_date + 30 * 24 * 60 * 60) * 1000).toISOString() // 30 days from start
            })
            .eq('id', tenantId);
            
          if (updateError) {
            console.error("Error updating tenant subscription status:", updateError);
          } else {
            console.log("Tenant subscription status updated successfully");
          }

          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const tenantId = subscription.metadata?.tenant_id;

          if (!tenantId) {
            throw new Error("No tenant_id found in subscription metadata");
          }

          // Update tenant subscription directly
          const { error: updateError } = await supabase
            .from('tenants')
            .update({
              subscription_id: null,
              plan_type: 'free',
              subscription_status: 'cancelled',
              payment_method: 'stripe',
              customer_id: subscription.customer as string,
              subscription_start_date: null,
              subscription_end_date: null
            })
            .eq('id', tenantId);
            
          if (updateError) {
            console.error("Error canceling tenant subscription:", updateError);
          } else {
            console.log("Tenant subscription canceled successfully");
          }

          break;
        }
        
        // Handle additional event types
        case "invoice.paid": {
          console.log("Processing invoice.paid event");
          // No specific action needed for invoice.paid as we handle payments in checkout.session.completed
          break;
        }
        
        case "customer.subscription.created": {
          const subscription = event.data.object as Stripe.Subscription;
          const tenantId = subscription.metadata?.tenant_id;
          
          if (tenantId) {
            // Update tenant subscription directly
            const { error: updateError } = await supabase
              .from('tenants')
              .update({
                subscription_id: subscription.id,
                plan_type: subscription.metadata?.plan_type || 'free',
                subscription_status: subscription.status,
                payment_method: 'stripe',
                customer_id: subscription.customer as string,
                subscription_start_date: new Date(subscription.start_date * 1000).toISOString(),
                subscription_end_date: new Date((subscription.start_date + 30 * 24 * 60 * 60) * 1000).toISOString() // 30 days from start
              })
              .eq('id', tenantId);
              
            if (updateError) {
              console.error("Error updating tenant for new subscription:", updateError);
            } else {
              console.log("Tenant updated with new subscription successfully");
            }
          }
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return NextResponse.json({ received: true });
    } catch (error) {
      console.error(`Error processing webhook event ${event.type}:`, error);
      
      // Log the error to the database for debugging
      try {
        await supabase.from("audit_logs").insert({
          action: "webhook_error",
          created_by: "system",
          entity_id: event.id,
          entity_type: "webhook",
          tenant_id: null,
          details: {
            error: error instanceof Error ? error.message : String(error),
            event_type: event.type,
            timestamp: new Date().toISOString()
          }
        });
      } catch (logError) {
        console.error("Error logging webhook error to database:", logError);
      }
      
      return NextResponse.json(
        { error: `Error processing webhook: ${error instanceof Error ? error.message : String(error)}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
} 