import crypto from 'crypto';

export interface SkillResource {
  uri: string;
  digest: string;
  content: string;
}

export interface SkillEntry {
  uri: string;
  frontmatter: {
    name: string;
    description: string;
    [key: string]: any;
  };
  resources: Array<{
    uri: string;
    digest: string;
  }>;
}

function computeSha256(text: string): string {
  const hash = crypto.createHash('sha256').update(Buffer.from(text, 'utf-8')).digest('hex');
  return `sha256:${hash}`;
}

// 1. Skill: inventory-order-ops
const SKILL_MD_TEXT = `---
name: inventory-order-ops
description: Standard operating procedures for warehouse stock adjustments, manual orders, and packing fulfillment.
---

# Inventory & Order Operations Guide

This skill guides the AI assistant on operating within the NexusAI inventory and order platform:

## Order Lifecycle
1. When a customer initiates an order, call \`create_order\` with line items.
2. The system automatically reserves physical stock, preventing overselling.
3. Once packed, call \`mark_order_packed\` to update status and generate a packing slip.
4. When dispatched via courier, call \`mark_order_shipped\` with courier name and tracking number.
5. Shipped orders atomically decrement physical warehouse stock and release reservations.

## Safety & Confirmation Policies
- High-impact operations (\`adjust_inventory\`, \`create_order\`, \`cancel_order\`, \`mark_order_shipped\`, \`record_payment\`, \`approve_return\`) require explicit user confirmation.
- If called without confirmation, the server returns \`CONFIRMATION_REQUIRED\` with a secure confirmation token.
- Call the tool again with \`"confirm": true\` or \`"confirmation_token": "<token>"\` once confirmed.
`;

const ORDER_LIFECYCLE_MD_TEXT = `# Order State Transitions

Valid status progression:
- NEW -> CONFIRMED (stock reserved)
- CONFIRMED -> PROCESSING -> PACKED
- PACKED -> SHIPPED (physical stock deducted, reservations cleared, shipment logged)
- SHIPPED -> DELIVERED (delivering does NOT automatically mark as paid)
- CANCELLED -> releases all reserved stock back to available inventory.
`;

const LEDGER_POLICY_MD_TEXT = `# Inventory Ledger Accounting

Formula:
Available Stock = Physical Stock - Reserved Stock

Ledger transaction types:
- OPENING_STOCK: Initial inventory baseline
- STOCK_RECEIVED: Increments physical stock from suppliers
- MANUAL_ADJUSTMENT: Requires mandatory audit reason
- STOCK_RESERVED: Committed to customer orders
- RESERVATION_RELEASED: Released upon order cancellation
- ORDER_DISPATCHED: Deducts physical stock upon shipment
- RETURN_APPROVED_FOR_RESALE: Restores inspected sellable units
- DAMAGED_GOODS: Quarantined write-off
`;

// Compute resources & digests
const skillResources: Record<string, SkillResource> = {};

function registerResource(uri: string, content: string) {
  const digest = computeSha256(content);
  skillResources[uri] = { uri, digest, content };
  return { uri, digest };
}

const resSkillMd = registerResource(
  'skill://nexus-inventory/inventory-order-ops/SKILL.md',
  SKILL_MD_TEXT
);

const resLifecycleMd = registerResource(
  'skill://nexus-inventory/inventory-order-ops/references/order_lifecycle.md',
  ORDER_LIFECYCLE_MD_TEXT
);

const resLedgerMd = registerResource(
  'skill://nexus-inventory/inventory-order-ops/references/ledger_policy.md',
  LEDGER_POLICY_MD_TEXT
);

export const skillsCatalog: SkillEntry[] = [
  {
    uri: resSkillMd.uri,
    frontmatter: {
      name: 'inventory-order-ops',
      description: 'Standard operating procedures for warehouse stock adjustments, manual orders, and packing fulfillment.',
    },
    resources: [
      { uri: resSkillMd.uri, digest: resSkillMd.digest },
      { uri: resLifecycleMd.uri, digest: resLifecycleMd.digest },
      { uri: resLedgerMd.uri, digest: resLedgerMd.digest },
    ],
  },
];

export function listSkills(cursor?: string) {
  // We have 1 skill currently; supports pagination shape
  return {
    skills: skillsCatalog,
    nextCursor: undefined,
  };
}

export function getSkill(uri: string): SkillEntry | undefined {
  return skillsCatalog.find((s) => s.uri === uri);
}

export function getSkillResource(uri: string): SkillResource | undefined {
  return skillResources[uri];
}
