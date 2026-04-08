from reportlab.pdfgen import canvas

c = canvas.Canvas("/Users/pdt/Documents/DMS/test_po.pdf")
c.drawString(100, 750, "PURCHASE ORDER")
c.drawString(100, 700, "Item: 100x Towels")
c.drawString(100, 680, "Price: $500")

# The keyword we will search for to stamp
c.drawString(100, 200, "Checked by:")
c.save()
