/**
 * Seed script to add default templates to the database
 * Run this script once to populate the templates table with sample templates
 * 
 * Usage: Import and call seedTemplates() from your app or run via a script
 */

import { createCompanyTemplate } from '../services/templateService'

const DEFAULT_TEMPLATES = [
  {
    name: 'Standard Demand Letter',
    type: 'demand-letter',
    content: `[Your Name]
[Your Address]
[Your Phone]
[Your Email]

[Date]

[Recipient Name]
[Recipient Title]
[Recipient Company]
[Recipient Address]

Subject: Demand for Payment/Performance

Dear [Recipient Name],

I am writing to formally demand [specific action or payment amount] regarding [brief description of the matter].

[Body of the letter with details]

If this matter is not resolved within [number] days of receipt of this letter, I will have no choice but to pursue all available legal remedies.

I look forward to your prompt response.

Sincerely,
[Your Name]`
  },
  {
    name: 'Payment Demand Letter',
    type: 'demand-letter',
    content: `[Your Name]
[Your Address]
[Your Phone]
[Your Email]

[Date]

[Recipient Name]
[Recipient Title]
[Recipient Company]
[Recipient Address]

Subject: Demand for Payment of Outstanding Balance

Dear [Recipient Name],

This letter serves as a formal demand for payment of the outstanding balance of $[amount] owed to [Your Name/Company] for [description of services/goods].

According to our records, the following amounts are due:
- Invoice #[invoice number]: $[amount] - Due Date: [date]
- [Additional invoices if applicable]

Payment is due immediately. Please remit payment to [payment address/method] within [number] days of receipt of this letter.

If payment is not received by [deadline date], I will be forced to take legal action to recover the amount owed, plus interest, court costs, and attorney's fees.

I trust this matter can be resolved promptly.

Sincerely,
[Your Name]`
  },
  {
    name: 'Contract Breach Notice',
    type: 'demand-letter',
    content: `[Your Name]
[Your Address]
[Your Phone]
[Your Email]

[Date]

[Recipient Name]
[Recipient Title]
[Recipient Company]
[Recipient Address]

Subject: Notice of Breach of Contract and Demand for Cure

Dear [Recipient Name],

This letter serves as formal notice that [Recipient Company] is in breach of the contract dated [contract date] between [Your Company] and [Recipient Company] (the "Contract").

Specifically, [Recipient Company] has failed to [specific breach description], which constitutes a material breach of Section [section number] of the Contract.

Pursuant to the terms of the Contract, you have [number] days from the date of this letter to cure the breach. If the breach is not cured within this time period, [Your Company] will exercise all rights and remedies available under the Contract and applicable law, including but not limited to [specific remedies].

I look forward to your immediate attention to this matter.

Sincerely,
[Your Name]`
  }
]

/**
 * Seed the database with default templates
 * This will create the templates if they don't already exist
 */
export async function seedTemplates() {
  try {
    console.log('Starting template seeding...')
    
    const results = []
    for (const template of DEFAULT_TEMPLATES) {
      try {
        const created = await createCompanyTemplate(template)
        results.push({ success: true, template: created.name, id: created.id })
        console.log(`✓ Created template: ${created.name}`)
      } catch (error) {
        // If template already exists or other error, log it
        if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
          console.log(`⊘ Template already exists: ${template.name}`)
          results.push({ success: false, template: template.name, reason: 'already exists' })
        } else {
          console.error(`✗ Error creating template "${template.name}":`, error.message)
          results.push({ success: false, template: template.name, reason: error.message })
        }
      }
    }
    
    console.log('Template seeding completed.')
    return results
  } catch (error) {
    console.error('Error seeding templates:', error)
    throw error
  }
}

// If running directly (not imported), execute the seed function
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTemplates()
    .then((results) => {
      console.log('\nSeeding results:', results)
      process.exit(0)
    })
    .catch((error) => {
      console.error('Seeding failed:', error)
      process.exit(1)
    })
}

