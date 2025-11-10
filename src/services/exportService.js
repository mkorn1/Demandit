// Export service for generating DOCX and PDF files client-side

/**
 * Export content to DOCX format
 * @param {string} content - The text content to export
 * @param {string} filename - The filename (without extension)
 */
export async function exportToDOCX(content, filename = 'draft') {
  try {
    // Dynamic import to avoid bundling if not used
    const { Document, Packer, Paragraph, TextRun } = await import('docx')
    
    // Split content into paragraphs (by double newlines or single newlines)
    const paragraphs = content
      .split(/\n\s*\n/)
      .filter(p => p.trim())
      .map(text => 
        new Paragraph({
          children: [
            new TextRun({
              text: text.trim().replace(/\n/g, ' '),
              font: 'Times New Roman',
              size: 22, // 11pt
            }),
          ],
          spacing: {
            after: 200, // 10pt spacing after paragraph
          },
        })
      )

    // If no paragraphs found, create one with all content
    if (paragraphs.length === 0) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: content,
              font: 'Times New Roman',
              size: 22,
            }),
          ],
        })
      )
    }

    // Create document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    })

    // Generate blob and download
    const blob = await Packer.toBlob(doc)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.docx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting to DOCX:', error)
    throw new Error('Failed to export DOCX. Please ensure the docx library is installed.')
  }
}

/**
 * Export content to PDF format
 * @param {string} content - The text content to export
 * @param {string} filename - The filename (without extension)
 */
export async function exportToPDF(content, filename = 'draft') {
  try {
    // Dynamic import to avoid bundling if not used
    const { jsPDF } = await import('jspdf')
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
    })

    // Set font
    doc.setFont('times', 'normal')
    doc.setFontSize(11)

    // Page dimensions (letter size: 8.5" x 11" = 215.9mm x 279.4mm)
    const pageWidth = 215.9
    const pageHeight = 279.4
    const margin = 25.4 // 1 inch margins
    const maxWidth = pageWidth - (margin * 2)
    const lineHeight = 7

    // Split content into lines that fit the page width
    const lines = doc.splitTextToSize(content, maxWidth)
    
    let y = margin
    const pageBottom = pageHeight - margin

    lines.forEach((line) => {
      // Check if we need a new page
      if (y + lineHeight > pageBottom) {
        doc.addPage()
        y = margin
      }

      doc.text(line, margin, y)
      y += lineHeight
    })

    // Save the PDF
    doc.save(`${filename}.pdf`)
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    throw new Error('Failed to export PDF. Please ensure the jspdf library is installed.')
  }
}

