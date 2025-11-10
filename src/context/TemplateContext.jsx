import { createContext, useContext, useState, useEffect } from 'react'

const TemplateContext = createContext()

export function TemplateProvider({ children, initialSelectedTemplate = null, onTemplateChange = null }) {
  const [templates, setTemplates] = useState([
    {
      id: 'default-demand-letter',
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
[Your Name]`,
      createdAt: new Date(),
      isDefault: true
    },
    {
      id: 'payment-demand',
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
[Your Name]`,
      createdAt: new Date(),
      isDefault: true
    },
    {
      id: 'contract-breach',
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
[Your Name]`,
      createdAt: new Date(),
      isDefault: true
    }
  ])
  const [internalSelectedTemplate, setInternalSelectedTemplate] = useState(initialSelectedTemplate)
  
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
  
  const handleSetSelectedTemplate = (templateId) => {
    if (onTemplateChange) {
      onTemplateChange(templateId)
    } else {
      setInternalSelectedTemplate(templateId)
    }
  }

  const addTemplate = (template) => {
    const newTemplate = {
      ...template,
      id: template.id || `template-${Date.now()}`,
      createdAt: new Date(),
      isDefault: false
    }
    setTemplates(prev => [...prev, newTemplate])
    return newTemplate
  }

  const updateTemplate = (templateId, updates) => {
    setTemplates(prev =>
      prev.map(template =>
        template.id === templateId ? { ...template, ...updates } : template
      )
    )
  }

  const deleteTemplate = (templateId) => {
    setTemplates(prev => prev.filter(template => template.id !== templateId))
    if (selectedTemplate === templateId) {
      handleSetSelectedTemplate(null)
    }
  }

  const getTemplate = (templateId) => {
    return templates.find(t => t.id === templateId)
  }

  return (
    <TemplateContext.Provider
      value={{
        templates,
        selectedTemplate,
        addTemplate,
        updateTemplate,
        deleteTemplate,
        getTemplate,
        setSelectedTemplate: handleSetSelectedTemplate
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

