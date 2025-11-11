import { createContext, useContext, useState, useEffect } from 'react'
import { 
  getCompanyTemplates, 
  createCompanyTemplate, 
  updateCompanyTemplate, 
  deleteCompanyTemplate 
} from '../services/templateService'

const TemplateContext = createContext()

export function TemplateProvider({ children, initialSelectedTemplate = null, onTemplateChange = null }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [internalSelectedTemplate, setInternalSelectedTemplate] = useState(initialSelectedTemplate)
  
  // Load templates from database on mount
  useEffect(() => {
    loadTemplates()
  }, [])
  
  // Sync internal state when initialSelectedTemplate changes (e.g., when loading a new case)
  useEffect(() => {
    if (initialSelectedTemplate !== null && initialSelectedTemplate !== undefined) {
      setInternalSelectedTemplate(initialSelectedTemplate)
    }
  }, [initialSelectedTemplate])
  
  // Use controlled value if provided, otherwise use internal state
  const selectedTemplate = initialSelectedTemplate !== null && initialSelectedTemplate !== undefined 
    ? initialSelectedTemplate 
    : internalSelectedTemplate
  
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

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const data = await getCompanyTemplates()
      
      // Auto-seed templates if none exist
      if (data.length === 0) {
        console.log('No templates found. Seeding default templates...')
        for (const template of DEFAULT_TEMPLATES) {
          try {
            await createCompanyTemplate(template)
            console.log(`✓ Seeded template: ${template.name}`)
          } catch (error) {
            console.error(`Error seeding template "${template.name}":`, error)
          }
        }
        // Reload templates after seeding
        const reloadedData = await getCompanyTemplates()
        const formattedTemplates = reloadedData.map(t => ({
          id: t.id,
          name: t.name,
          type: t.type,
          content: t.content,
          createdAt: new Date(t.created_at),
          isDefault: false
        }))
        setTemplates(formattedTemplates)
      } else {
        // Transform database format to match expected format
        const formattedTemplates = data.map(t => ({
          id: t.id,
          name: t.name,
          type: t.type,
          content: t.content,
          createdAt: new Date(t.created_at),
          isDefault: false
        }))
        setTemplates(formattedTemplates)
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }
  
  const handleSetSelectedTemplate = (templateId) => {
    if (onTemplateChange) {
      onTemplateChange(templateId)
    } else {
      setInternalSelectedTemplate(templateId)
    }
  }

  const addTemplate = async (template) => {
    try {
      const newTemplate = await createCompanyTemplate({
        name: template.name,
        type: template.type || 'demand-letter',
        content: template.content
      })
      // Reload templates to get the new one
      await loadTemplates()
      return {
        id: newTemplate.id,
        name: newTemplate.name,
        type: newTemplate.type,
        content: newTemplate.content,
        createdAt: new Date(newTemplate.created_at),
      isDefault: false
    }
    } catch (error) {
      console.error('Error creating template:', error)
      throw error
    }
  }

  const updateTemplate = async (templateId, updates) => {
    try {
      await updateCompanyTemplate(templateId, updates)
      // Reload templates to get the updated one
      await loadTemplates()
    } catch (error) {
      console.error('Error updating template:', error)
      throw error
    }
  }

  const deleteTemplate = async (templateId) => {
    try {
      await deleteCompanyTemplate(templateId)
      // Reload templates to reflect deletion
      await loadTemplates()
    if (selectedTemplate === templateId) {
      handleSetSelectedTemplate(null)
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      throw error
    }
  }

  const getTemplate = (templateId) => {
    return templates.find(t => t.id === templateId)
  }

  return (
    <TemplateContext.Provider
      value={{
        templates,
        loading,
        selectedTemplate,
        addTemplate,
        updateTemplate,
        deleteTemplate,
        getTemplate,
        setSelectedTemplate: handleSetSelectedTemplate,
        refreshTemplates: loadTemplates
      }}
    >
      {children}
    </TemplateContext.Provider>
  )
}

export function useTemplates() {
  const context = useContext(TemplateContext)
  if (!context) {
    throw new Error('useTemplates must be used within a TemplateProvider')
  }
  return context
}

