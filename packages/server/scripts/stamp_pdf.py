import sys
import os
import fitz  # PyMuPDF
import argparse

def stamp_pdf(input_pdf_path, output_pdf_path, signature_image_path, keyword, position_hint='Above', offset_x=0, offset_y=0, delegate_name="", abs_x=None, abs_y=None, abs_page=None, abs_width=140, abs_height=60):
    """
    Stamps a PNG signature image onto a PDF.
    Can stamp either by searching for a keyword (default) or by absolute coordinates (if abs_x/y are provided).
    """
    try:
        # Validate files exist
        if not os.path.isfile(input_pdf_path):
            print(f"Error: Input PDF not found: {input_pdf_path}", file=sys.stderr)
            sys.exit(1)
        if not os.path.isfile(signature_image_path):
            print(f"Error: Signature image not found: {signature_image_path}", file=sys.stderr)
            sys.exit(1)

        # Open PDF
        doc = fitz.open(input_pdf_path)
        found = False
        
        if abs_x is not None and abs_y is not None and abs_page is not None:
            # Absolute Coordinate Mode (from UI Dragging)
            page_index = max(0, min(abs_page - 1, len(doc) - 1))
            page = doc[page_index]
            stamp_rect = fitz.Rect(abs_x, abs_y, abs_x + abs_width, abs_y + abs_height)
            
            print(f"Stamping signature at ABSOLUTE rect {stamp_rect} on page {page_index + 1}")
            page.insert_image(stamp_rect, filename=signature_image_path)
            
            if delegate_name and delegate_name.strip():
                text = f"a.n. {delegate_name}"
                text_x = stamp_rect.x0
                text_y = stamp_rect.y1 + 10
                page.insert_text(fitz.Point(text_x, text_y), text, fontsize=9, fill=(0.1, 0.1, 0.1))
                
            found = True
        else:
            # Keyword Search Mode (Default)
            # Standard signature size (slightly smaller for cleaner fit)
            sig_width = 100
            sig_height = 50
            # Gap between signature bottom edge and keyword top edge
            gap_above = 8  # small gap so stamp sits just above the signature line
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                # Search for keyword (case-insensitive by using both original and lower)
                text_instances = page.search_for(keyword)
                
                if not text_instances:
                    # Try case-insensitive: search for lowercase version
                    text_instances = page.search_for(keyword.lower())
                if not text_instances:
                    # Try uppercase
                    text_instances = page.search_for(keyword.upper())
                
                if text_instances:
                    # Grab the first match
                    rect = text_instances[0]
                    print(f"Found keyword '{keyword}' on page {page_num + 1} at rect {rect}")
                    
                    # Left-align with a small leftward offset for visual centering
                    sig_x0 = rect.x0 - 10
                    sig_x1 = sig_x0 + sig_width
                    
                    # Determine Y position based on hint
                    hint = (position_hint or 'Above').lower()
                    
                    if 'above' in hint or 'top' in hint or 'upper' in hint:
                        # Place signature ABOVE the keyword
                        sig_y1 = rect.y0 - gap_above  # Bottom edge of signature is above keyword top
                        sig_y0 = sig_y1 - sig_height   # Top edge of signature
                    elif 'right' in hint:
                        # Place signature to the RIGHT of the keyword
                        sig_x0 = rect.x1 + 10
                        sig_x1 = sig_x0 + sig_width
                        sig_y0 = rect.y0 - 20
                        sig_y1 = sig_y0 + sig_height
                    else:
                    # Default: ABOVE (user's preferred behavior)
                        sig_y1 = rect.y0 - gap_above
                        sig_y0 = sig_y1 - sig_height
                    
                    # Apply custom user offsets
                    # PDF Y is top-down, so moving UP (positive offset_y) means subtracting from Y
                    # Moving RIGHT (positive offset_x) means adding to X
                    final_x0 = sig_x0 + offset_x
                    final_x1 = sig_x1 + offset_x
                    final_y0 = sig_y0 - offset_y
                    final_y1 = sig_y1 - offset_y
                    
                    stamp_rect = fitz.Rect(final_x0, final_y0, final_x1, final_y1)
                    
                    # Bounds checking — ensure we don't go off the page
                    page_rect = page.rect
                    
                    # If signature goes above the page top, push it down
                    if stamp_rect.y0 < page_rect.y0:
                        shift = page_rect.y0 - stamp_rect.y0 + 5
                        stamp_rect = fitz.Rect(stamp_rect.x0, stamp_rect.y0 + shift, 
                                            stamp_rect.x1, stamp_rect.y1 + shift)
                    
                    # If signature goes below the page bottom, push it up
                    if stamp_rect.y1 > page_rect.y1:
                        shift = stamp_rect.y1 - page_rect.y1 + 5
                        stamp_rect = fitz.Rect(stamp_rect.x0, stamp_rect.y0 - shift, 
                                            stamp_rect.x1, stamp_rect.y1 - shift)
                    
                    # If signature goes off the left/right edges, clamp it
                    if stamp_rect.x0 < page_rect.x0:
                        stamp_rect = fitz.Rect(page_rect.x0 + 5, stamp_rect.y0,
                                            page_rect.x0 + 5 + sig_width, stamp_rect.y1)
                    if stamp_rect.x1 > page_rect.x1:
                        stamp_rect = fitz.Rect(page_rect.x1 - sig_width - 5, stamp_rect.y0,
                                            page_rect.x1 - 5, stamp_rect.y1)
                    
                    print(f"Stamping signature at rect {stamp_rect} (Offsets applied: x={offset_x}, y={offset_y})")
                    
                    # Insert the signature image
                    page.insert_image(stamp_rect, filename=signature_image_path)
                    
                    # Add delegation text if provided
                    if delegate_name and delegate_name.strip():
                        text = f"a.n. {delegate_name}"
                        text_x = stamp_rect.x0
                        text_y = stamp_rect.y1 + 10 # 10px below the image bottom
                        # Ensure font is small enough (removed explicit fontname which caused PyMuPDF parsing errors on windows)
                        page.insert_text(fitz.Point(text_x, text_y), text, fontsize=9, fill=(0.1, 0.1, 0.1))
                    
                    found = True
                    break  # Stamp once per keyword occurrence
            
            if not found:
                # Default to last page, bottom center
                last_page = doc[-1]
                pr = last_page.rect
                stamp_rect = fitz.Rect(pr.x1/2 - 60, pr.y1 - 100, pr.x1/2 + 60, pr.y1 - 40)
                last_page.insert_image(stamp_rect, filename=signature_image_path)
            
        # Ensure output directory exists
        output_dir = os.path.dirname(output_pdf_path)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)

        # Save to output path
        doc.save(output_pdf_path)
        doc.close()
        print(f"Success: Stamped output saved to {output_pdf_path}")
        
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Stamp PDF with signature")
    parser.add_argument("in_pdf")
    parser.add_argument("out_pdf")
    parser.add_argument("sig_img")
    parser.add_argument("kw")
    parser.add_argument("--pos", default="Above")
    parser.add_argument("--offset_x", type=int, default=0)
    parser.add_argument("--offset_y", type=int, default=0)
    parser.add_argument("--delegate_name", type=str, default="")
    parser.add_argument("--abs_x", type=int, default=None)
    parser.add_argument("--abs_y", type=int, default=None)
    parser.add_argument("--abs_page", type=int, default=None)
    parser.add_argument("--abs_width", type=int, default=140)
    parser.add_argument("--abs_height", type=int, default=60)

    args = parser.parse_args()
    stamp_pdf(args.in_pdf, args.out_pdf, args.sig_img, args.kw, args.pos, args.offset_x, args.offset_y, args.delegate_name, args.abs_x, args.abs_y, args.abs_page, args.abs_width, args.abs_height)
