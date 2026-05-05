import sys
import os
import fitz  # PyMuPDF
import argparse
import json

def find_keyword(input_pdf_path, keyword, position_hint='Above', offset_x=0, offset_y=0):
    try:
        if not os.path.isfile(input_pdf_path):
            print(json.dumps({"error": f"Input PDF not found: {input_pdf_path}"}))
            sys.exit(1)

        doc = fitz.open(input_pdf_path)
        found = False
        
        sig_width = 140
        sig_height = 60
        gap_above = 8
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            text_instances = page.search_for(keyword)
            if not text_instances:
                text_instances = page.search_for(keyword.lower())
            if not text_instances:
                text_instances = page.search_for(keyword.upper())
            
            if text_instances:
                rect = text_instances[0]
                
                sig_x0 = rect.x0 - 10
                sig_x1 = sig_x0 + sig_width
                
                hint = (position_hint or 'Above').lower()
                
                if 'above' in hint or 'top' in hint or 'upper' in hint:
                    sig_y1 = rect.y0 - gap_above
                    sig_y0 = sig_y1 - sig_height
                elif 'right' in hint:
                    sig_x0 = rect.x1 + 10
                    sig_x1 = sig_x0 + sig_width
                    sig_y0 = rect.y0 - 20
                    sig_y1 = sig_y0 + sig_height
                else:
                    sig_y1 = rect.y0 - gap_above
                    sig_y0 = sig_y1 - sig_height
                
                final_x0 = sig_x0 + offset_x
                final_y0 = sig_y0 - offset_y
                final_x1 = final_x0 + sig_width
                final_y1 = final_y0 + sig_height
                
                # Create a rect to simulate stamp bounds
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
                
                print(json.dumps({
                    "found": True,
                    "page": page_num + 1,
                    "x": stamp_rect.x0,
                    "y": stamp_rect.y0,
                    "width": sig_width,
                    "height": sig_height
                }))
                doc.close()
                return
                
        # If not found
        print(json.dumps({
            "found": False,
            "error": f"Keyword '{keyword}' not found"
        }))
        doc.close()
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Find keyword exact coordinates in PDF")
    parser.add_argument("in_pdf")
    parser.add_argument("kw")
    parser.add_argument("--pos", default="Above")
    parser.add_argument("--offset_x", type=int, default=0)
    parser.add_argument("--offset_y", type=int, default=0)

    args = parser.parse_args()
    find_keyword(args.in_pdf, args.kw, args.pos, args.offset_x, args.offset_y)
