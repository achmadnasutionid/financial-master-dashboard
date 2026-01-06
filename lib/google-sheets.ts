import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { join } from 'path';
import { prisma } from '@/lib/prisma';

// Initialize Google Sheets API
let sheetsClient: any = null;

function getGoogleSheetsClient() {
  if (sheetsClient) return sheetsClient;

  try {
    let credentials;
    
    // In production (Vercel), use environment variable
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } 
    // In development, use file
    else {
      const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || './google-credentials.json';
      credentials = JSON.parse(readFileSync(join(process.cwd(), credentialsPath), 'utf-8'));
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    sheetsClient = google.sheets({ version: 'v4', auth });
    return sheetsClient;
  } catch (error) {
    console.error('Error initializing Google Sheets client:', error);
    return null;
  }
}

// Get all products from master data (ordered by creation date)
async function getAllProducts() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'asc' }
    });
    return products.map(p => p.name);
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

// Ensure sheet exists with proper headers
async function ensureQuotationSheetExists(sheets: any, spreadsheetId: string, year: number) {
  const sheetName = `QUOTATION ${year}`;
  
  try {
    const response = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = response.data.sheets.some(
      (sheet: any) => sheet.properties.title === sheetName
    );

    if (!sheetExists) {
      // Create sheet
      const createResponse = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });
      
      console.log(`Created new sheet: ${sheetName}`);
      
      // Get the new sheet ID from response
      const newSheetId = createResponse.data.replies[0].addSheet.properties.sheetId;

      // Get all products and create headers
      const products = await getAllProducts();
      const headers = [
        'ID',
        'Bill To',
        'Status',
        'Date',
        'Total Amount',
        ...products
      ];

      // Add header row starting from A1
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:ZZ1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });

      // Format header row (bold, background color, taller height, NO wrap, shrink to fit) and freeze
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              // Style header row (columns A-D) - bold + gray background
              repeatCell: {
                range: {
                  sheetId: newSheetId,
                  startRowIndex: 0, // Row 1 (0-indexed)
                  endRowIndex: 1,
                  startColumnIndex: 0, // Column A (0-indexed)
                  endColumnIndex: 4, // Up to column D (ID, Bill To, Status, Date)
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true, fontSize: 10 },
                    backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                    wrapStrategy: 'CLIP', // Don't wrap, clip instead
                    verticalAlignment: 'MIDDLE',
                  },
                },
                fields: 'userEnteredFormat(textFormat,backgroundColor,wrapStrategy,verticalAlignment)',
              },
            },
            {
              // Style Total Amount header (column E) - bold + DIFFERENT COLOR as separator
              repeatCell: {
                range: {
                  sheetId: newSheetId,
                  startRowIndex: 0, // Row 1 (0-indexed)
                  endRowIndex: 1,
                  startColumnIndex: 4, // Column E (Total Amount)
                  endColumnIndex: 5,
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true, fontSize: 10 },
                    backgroundColor: { red: 0.8, green: 0.9, blue: 1.0 }, // Light blue separator
                    wrapStrategy: 'CLIP',
                    verticalAlignment: 'MIDDLE',
                  },
                },
                fields: 'userEnteredFormat(textFormat,backgroundColor,wrapStrategy,verticalAlignment)',
              },
            },
            {
              // Style product columns headers (F onward) - bold + gray background
              repeatCell: {
                range: {
                  sheetId: newSheetId,
                  startRowIndex: 0, // Row 1 (0-indexed)
                  endRowIndex: 1,
                  startColumnIndex: 5, // Column F onward (Products)
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true, fontSize: 10 },
                    backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                    wrapStrategy: 'CLIP',
                    verticalAlignment: 'MIDDLE',
                  },
                },
                fields: 'userEnteredFormat(textFormat,backgroundColor,wrapStrategy,verticalAlignment)',
              },
            },
            {
              // Make ONLY header row (row 1) taller
              updateDimensionProperties: {
                range: {
                  sheetId: newSheetId,
                  dimension: 'ROWS',
                  startIndex: 0, // Row 1
                  endIndex: 1,
                },
                properties: {
                  pixelSize: 42, // ~2x regular height
                },
                fields: 'pixelSize',
              },
            },
            {
              // Make ID column (column A) compact - fit QTN-2026-0002
              updateDimensionProperties: {
                range: {
                  sheetId: newSheetId,
                  dimension: 'COLUMNS',
                  startIndex: 0, // Column A (ID)
                  endIndex: 1,
                },
                properties: {
                  pixelSize: 110, // Compact for ID
                },
                fields: 'pixelSize',
              },
            },
            {
              // Make Bill To column (column B) moderate width
              updateDimensionProperties: {
                range: {
                  sheetId: newSheetId,
                  dimension: 'COLUMNS',
                  startIndex: 1, // Column B (Bill To)
                  endIndex: 2,
                },
                properties: {
                  pixelSize: 140, // Moderate width for client names
                },
                fields: 'pixelSize',
              },
            },
            {
              // Make Status column (column C) compact
              updateDimensionProperties: {
                range: {
                  sheetId: newSheetId,
                  dimension: 'COLUMNS',
                  startIndex: 2, // Column C (Status)
                  endIndex: 3,
                },
                properties: {
                  pixelSize: 80, // Compact for status text
                },
                fields: 'pixelSize',
              },
            },
            {
              // Make Production Date column (column D) compact
              updateDimensionProperties: {
                range: {
                  sheetId: newSheetId,
                  dimension: 'COLUMNS',
                  startIndex: 3, // Column D (Date)
                  endIndex: 4,
                },
                properties: {
                  pixelSize: 70, // Compact for MM/DD dates
                },
                fields: 'pixelSize',
              },
            },
            {
              // Make Total Amount column (column E) compact
              updateDimensionProperties: {
                range: {
                  sheetId: newSheetId,
                  dimension: 'COLUMNS',
                  startIndex: 4, // Column E (Total Amount)
                  endIndex: 5,
                },
                properties: {
                  pixelSize: 100, // Compact for amounts
                },
                fields: 'pixelSize',
              },
            },
            {
              // Make all product columns (from F onward) narrow for numbers
              updateDimensionProperties: {
                range: {
                  sheetId: newSheetId,
                  dimension: 'COLUMNS',
                  startIndex: 5, // Column F onward (Products)
                  endIndex: 5 + products.length, // All product columns
                },
                properties: {
                  pixelSize: 75, // Narrow for product amounts
                },
                fields: 'pixelSize',
              },
            },
            {
              // Freeze row 1 (header)
              updateSheetProperties: {
                properties: {
                  sheetId: newSheetId,
                  gridProperties: {
                    frozenRowCount: 1,
                  },
                },
                fields: 'gridProperties.frozenRowCount',
              },
            },
          ],
        },
      });
    }

    return sheetName;
  } catch (error) {
    console.error('Error ensuring sheet exists:', error);
    return null;
  }
}

// Find row index by Quotation ID (starting from row 2, column A)
async function findQuotationRowIndex(sheets: any, spreadsheetId: string, sheetName: string, quotationId: string): Promise<number | null> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`, // Search in column A
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((row: any[]) => row[0] === quotationId);
    
    return rowIndex >= 0 ? rowIndex + 1 : null; // +1 because sheets are 1-indexed
  } catch (error) {
    console.error('Error finding quotation row:', error);
    return null;
  }
}

// Log Quotation to Google Sheets
export async function logQuotationToSheets(quotation: any) {
  try {
    const sheets = getGoogleSheetsClient();
    if (!sheets) {
      console.warn('Google Sheets client not available');
      return false;
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      console.warn('GOOGLE_SHEET_ID not set in environment variables');
      return false;
    }

    // Only log if status is "pending" or "accepted"
    if (quotation.status !== 'pending' && quotation.status !== 'accepted') {
      console.log(`Skipping log - quotation status is "${quotation.status}"`);
      return false;
    }

    // Get year from production date
    const year = new Date(quotation.productionDate).getFullYear();
    
    // Ensure sheet exists
    const sheetName = await ensureQuotationSheetExists(sheets, spreadsheetId, year);
    if (!sheetName) return false;

    // Get sheet info to get sheetId
    const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = sheetInfo.data.sheets.find((s: any) => s.properties.title === sheetName);
    const sheetId = sheet?.properties.sheetId;

    // Get all products to match columns
    const allProducts = await getAllProducts();

    // Calculate product totals from quotation items
    const productTotals: Record<string, number> = {};
    allProducts.forEach(productName => {
      productTotals[productName] = 0;
    });

    // Sum up totals for each product
    if (quotation.items) {
      quotation.items.forEach((item: any) => {
        if (productTotals.hasOwnProperty(item.productName)) {
          productTotals[item.productName] += parseFloat(item.total) || 0;
        }
      });
    }

    // Prepare row data
    const rowData = [
      quotation.quotationId,
      quotation.billTo,
      quotation.status,
      new Date(quotation.productionDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }), // MM/DD format without year
      Math.round(quotation.totalAmount), // Round to whole number, no decimals
      ...allProducts.map(productName => productTotals[productName] || 0)
    ];

    // Check if quotation already exists in sheet
    const existingRowIndex = await findQuotationRowIndex(sheets, spreadsheetId, sheetName, quotation.quotationId);

    if (existingRowIndex) {
      // Update existing row (starting from column A)
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A${existingRowIndex}:ZZ${existingRowIndex}`,
        valueInputOption: 'USER_ENTERED', // Changed to USER_ENTERED to support formulas
        requestBody: {
          values: [rowData],
        },
      });
      
      // Clear formatting to white background (no color coding)
      if (sheetId !== undefined) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                repeatCell: {
                  range: {
                    sheetId: sheetId,
                    startRowIndex: existingRowIndex - 1,
                    endRowIndex: existingRowIndex,
                    startColumnIndex: 0,
                  },
                  cell: {
                    userEnteredFormat: {
                      textFormat: { bold: false, fontSize: 10 },
                      backgroundColor: { red: 1, green: 1, blue: 1 }, // White background
                    },
                  },
                  fields: 'userEnteredFormat(textFormat,backgroundColor)',
                },
              },
            ],
          },
        });
      }
      
      console.log(`✅ Updated quotation in Google Sheets: ${quotation.quotationId}`);
    } else {
      // Append new row (starting from column A, row 2+)
      const appendResult = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A2:ZZ`,
        valueInputOption: 'USER_ENTERED', // Changed to USER_ENTERED to support formulas
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData],
        },
      });
      
      // Get the row that was just added
      const updatedRange = appendResult.data.updates.updatedRange;
      const rowMatch = updatedRange.match(/!A(\d+):/);
      if (rowMatch && sheetId !== undefined) {
        const newRowIndex = parseInt(rowMatch[1]);
        
        // Clear formatting on the newly added row
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                repeatCell: {
                  range: {
                    sheetId: sheetId,
                    startRowIndex: newRowIndex - 1, // 0-indexed
                    endRowIndex: newRowIndex,
                    startColumnIndex: 0,
                  },
                  cell: {
                    userEnteredFormat: {
                      textFormat: { bold: false, fontSize: 10 },
                      backgroundColor: { red: 1, green: 1, blue: 1 },
                    },
                  },
                  fields: 'userEnteredFormat(textFormat,backgroundColor)',
                },
              },
            ],
          },
        });
      }
      
      console.log(`✅ Added new quotation to Google Sheets: ${quotation.quotationId}`);
    }

    return true;
  } catch (error) {
    console.error('Error logging quotation to Google Sheets:', error);
    return false;
  }
}

// Delete quotation row from Google Sheets
export async function deleteQuotationFromSheets(quotationId: string, productionDate: Date) {
  try {
    const sheets = getGoogleSheetsClient();
    if (!sheets) {
      console.warn('Google Sheets client not available');
      return false;
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      console.warn('GOOGLE_SHEET_ID not set in environment variables');
      return false;
    }

    // Get year from production date
    const year = new Date(productionDate).getFullYear();
    const sheetName = `QUOTATION ${year}`;

    // Get sheet info to get sheetId
    const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = sheetInfo.data.sheets.find((s: any) => s.properties.title === sheetName);
    if (!sheet) {
      console.warn(`Sheet ${sheetName} not found`);
      return false;
    }
    const sheetId = sheet.properties.sheetId;

    // Find the row with this quotation ID
    const existingRowIndex = await findQuotationRowIndex(sheets, spreadsheetId, sheetName, quotationId);
    if (!existingRowIndex) {
      console.warn(`Quotation ${quotationId} not found in sheet`);
      return false;
    }

    // Delete the row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: existingRowIndex - 1, // 0-indexed
                endIndex: existingRowIndex,
              },
            },
          },
        ],
      },
    });

    console.log(`✅ Deleted quotation row from Google Sheets: ${quotationId}`);
    return true;
  } catch (error) {
    console.error('Error deleting quotation from Google Sheets:', error);
    return false;
  }
}

// ============================================
// INVOICE LOGGING FUNCTIONS
// ============================================

// Ensure INVOICE sheet exists with proper headers
async function ensureInvoiceSheetExists(sheets: any, spreadsheetId: string, year: number) {
  const sheetName = `INVOICE ${year}`;
  
  try {
    const response = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = response.data.sheets.some(
      (sheet: any) => sheet.properties.title === sheetName
    );

    if (!sheetExists) {
      // Create sheet
      const createResponse = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });
      
      console.log(`Created new sheet: ${sheetName}`);
      
      // Get the new sheet ID from response
      const newSheetId = createResponse.data.replies[0].addSheet.properties.sheetId;

      // Get all products and create headers
      const products = await getAllProducts();
      const headers = [
        'ID',
        'Bill To',
        'Status',
        'Date',
        'Total Amount',
        ...products
      ];

      // Add header row starting from A1
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:ZZ1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });

      // Format header row (same styling as quotation)
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: newSheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: 4,
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true, fontSize: 10 },
                    backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                    wrapStrategy: 'CLIP',
                    verticalAlignment: 'MIDDLE',
                  },
                },
                fields: 'userEnteredFormat(textFormat,backgroundColor,wrapStrategy,verticalAlignment)',
              },
            },
            {
              repeatCell: {
                range: {
                  sheetId: newSheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 4,
                  endColumnIndex: 5,
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true, fontSize: 10 },
                    backgroundColor: { red: 0.8, green: 0.9, blue: 1.0 },
                    wrapStrategy: 'CLIP',
                    verticalAlignment: 'MIDDLE',
                  },
                },
                fields: 'userEnteredFormat(textFormat,backgroundColor,wrapStrategy,verticalAlignment)',
              },
            },
            {
              repeatCell: {
                range: {
                  sheetId: newSheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 5,
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true, fontSize: 10 },
                    backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                    wrapStrategy: 'CLIP',
                    verticalAlignment: 'MIDDLE',
                  },
                },
                fields: 'userEnteredFormat(textFormat,backgroundColor,wrapStrategy,verticalAlignment)',
              },
            },
            {
              updateDimensionProperties: {
                range: {
                  sheetId: newSheetId,
                  dimension: 'ROWS',
                  startIndex: 0,
                  endIndex: 1,
                },
                properties: {
                  pixelSize: 42,
                },
                fields: 'pixelSize',
              },
            },
            {
              updateDimensionProperties: {
                range: {
                  sheetId: newSheetId,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: 1,
                },
                properties: {
                  pixelSize: 110,
                },
                fields: 'pixelSize',
              },
            },
            {
              updateDimensionProperties: {
                range: {
                  sheetId: newSheetId,
                  dimension: 'COLUMNS',
                  startIndex: 1,
                  endIndex: 2,
                },
                properties: {
                  pixelSize: 140,
                },
                fields: 'pixelSize',
              },
            },
            {
              updateDimensionProperties: {
                range: {
                  sheetId: newSheetId,
                  dimension: 'COLUMNS',
                  startIndex: 2,
                  endIndex: 3,
                },
                properties: {
                  pixelSize: 80,
                },
                fields: 'pixelSize',
              },
            },
            {
              updateDimensionProperties: {
                range: {
                  sheetId: newSheetId,
                  dimension: 'COLUMNS',
                  startIndex: 3,
                  endIndex: 4,
                },
                properties: {
                  pixelSize: 70,
                },
                fields: 'pixelSize',
              },
            },
            {
              updateDimensionProperties: {
                range: {
                  sheetId: newSheetId,
                  dimension: 'COLUMNS',
                  startIndex: 4,
                  endIndex: 5,
                },
                properties: {
                  pixelSize: 100,
                },
                fields: 'pixelSize',
              },
            },
            {
              updateDimensionProperties: {
                range: {
                  sheetId: newSheetId,
                  dimension: 'COLUMNS',
                  startIndex: 5,
                  endIndex: 5 + products.length,
                },
                properties: {
                  pixelSize: 75,
                },
                fields: 'pixelSize',
              },
            },
            {
              updateSheetProperties: {
                properties: {
                  sheetId: newSheetId,
                  gridProperties: {
                    frozenRowCount: 1,
                  },
                },
                fields: 'gridProperties.frozenRowCount',
              },
            },
          ],
        },
      });
    }

    return sheetName;
  } catch (error) {
    console.error('Error ensuring invoice sheet exists:', error);
    return null;
  }
}

// Find row index by Invoice ID
async function findInvoiceRowIndex(sheets: any, spreadsheetId: string, sheetName: string, invoiceId: string): Promise<number | null> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
    });

    const values = response.data.values || [];
    const rowIndex = values.findIndex((row: any[]) => row[0] === invoiceId);
    
    return rowIndex > 0 ? rowIndex + 1 : null;
  } catch (error) {
    console.error('Error finding invoice row:', error);
    return null;
  }
}

// Log invoice to Google Sheets
export async function logInvoiceToSheets(invoice: any) {
  try {
    const sheets = getGoogleSheetsClient();
    if (!sheets) {
      console.warn('Google Sheets client not available');
      return false;
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      console.warn('GOOGLE_SHEET_ID not set in environment variables');
      return false;
    }

    // Only log if status is "pending" or "paid"
    if (invoice.status !== 'pending' && invoice.status !== 'paid') {
      console.log(`Skipping log - invoice status is "${invoice.status}"`);
      return false;
    }

    // Get year from production date
    const year = new Date(invoice.productionDate).getFullYear();
    
    // Ensure sheet exists
    const sheetName = await ensureInvoiceSheetExists(sheets, spreadsheetId, year);
    if (!sheetName) return false;

    // Get sheet info to get sheetId
    const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = sheetInfo.data.sheets.find((s: any) => s.properties.title === sheetName);
    const sheetId = sheet?.properties.sheetId;

    // Get all products to match columns
    const allProducts = await getAllProducts();

    // Calculate product totals from invoice items
    const productTotals: Record<string, number> = {};
    allProducts.forEach(productName => {
      productTotals[productName] = 0;
    });

    // Sum up totals for each product
    if (invoice.items) {
      invoice.items.forEach((item: any) => {
        if (productTotals.hasOwnProperty(item.productName)) {
          productTotals[item.productName] += parseFloat(item.total) || 0;
        }
      });
    }

    // Prepare row data
    const rowData = [
      invoice.invoiceId,
      invoice.billTo,
      invoice.status,
      new Date(invoice.productionDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
      Math.round(invoice.totalAmount),
      ...allProducts.map(productName => productTotals[productName] || 0)
    ];

    // Check if invoice already exists in sheet
    const existingRowIndex = await findInvoiceRowIndex(sheets, spreadsheetId, sheetName, invoice.invoiceId);

    if (existingRowIndex) {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A${existingRowIndex}:ZZ${existingRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData],
        },
      });
      
      // Clear formatting
      if (sheetId !== undefined) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                repeatCell: {
                  range: {
                    sheetId: sheetId,
                    startRowIndex: existingRowIndex - 1,
                    endRowIndex: existingRowIndex,
                    startColumnIndex: 0,
                  },
                  cell: {
                    userEnteredFormat: {
                      textFormat: { bold: false, fontSize: 10 },
                      backgroundColor: { red: 1, green: 1, blue: 1 },
                    },
                  },
                  fields: 'userEnteredFormat(textFormat,backgroundColor)',
                },
              },
            ],
          },
        });
      }
      
      console.log(`✅ Updated invoice in Google Sheets: ${invoice.invoiceId}`);
    } else {
      // Append new row
      const appendResult = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A2:ZZ`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData],
        },
      });
      
      // Clear formatting on new row
      const updatedRange = appendResult.data.updates.updatedRange;
      const rowMatch = updatedRange.match(/!A(\d+):/);
      if (rowMatch && sheetId !== undefined) {
        const newRowIndex = parseInt(rowMatch[1]);
        
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                repeatCell: {
                  range: {
                    sheetId: sheetId,
                    startRowIndex: newRowIndex - 1,
                    endRowIndex: newRowIndex,
                    startColumnIndex: 0,
                  },
                  cell: {
                    userEnteredFormat: {
                      textFormat: { bold: false, fontSize: 10 },
                      backgroundColor: { red: 1, green: 1, blue: 1 },
                    },
                  },
                  fields: 'userEnteredFormat(textFormat,backgroundColor)',
                },
              },
            ],
          },
        });
      }
      
      console.log(`✅ Added new invoice to Google Sheets: ${invoice.invoiceId}`);
    }

    return true;
  } catch (error) {
    console.error('Error logging invoice to Google Sheets:', error);
    return false;
  }
}

// Delete invoice row from Google Sheets
export async function deleteInvoiceFromSheets(invoiceId: string, productionDate: Date) {
  try {
    const sheets = getGoogleSheetsClient();
    if (!sheets) {
      console.warn('Google Sheets client not available');
      return false;
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      console.warn('GOOGLE_SHEET_ID not set in environment variables');
      return false;
    }

    const year = new Date(productionDate).getFullYear();
    const sheetName = `INVOICE ${year}`;

    const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = sheetInfo.data.sheets.find((s: any) => s.properties.title === sheetName);
    if (!sheet) {
      console.warn(`Sheet ${sheetName} not found`);
      return false;
    }
    const sheetId = sheet.properties.sheetId;

    const existingRowIndex = await findInvoiceRowIndex(sheets, spreadsheetId, sheetName, invoiceId);
    if (!existingRowIndex) {
      console.warn(`Invoice ${invoiceId} not found in sheet`);
      return false;
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: existingRowIndex - 1,
                endIndex: existingRowIndex,
              },
            },
          },
        ],
      },
    });

    console.log(`✅ Deleted invoice row from Google Sheets: ${invoiceId}`);
    return true;
  } catch (error) {
    console.error('Error deleting invoice from Google Sheets:', error);
    return false;
  }
}

// ============================================
// EXPENSE LOGGING FUNCTIONS
// ============================================

// Ensure EXPENSE sheet exists with proper headers
async function ensureExpenseSheetExists(sheets: any, spreadsheetId: string, year: number) {
  const sheetName = `EXPENSE ${year}`;
  
  try {
    const response = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = response.data.sheets.some(
      (sheet: any) => sheet.properties.title === sheetName
    );

    if (!sheetExists) {
      // Create sheet
      const createResponse = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });
      
      console.log(`Created new sheet: ${sheetName}`);
      
      const newSheetId = createResponse.data.replies[0].addSheet.properties.sheetId;

      // Get all products for expense tracking
      const products = await getAllProducts();
      const headers = [
        'ID',
        'Project Name',
        'Status',
        'Date',
        'Total Expense',
        ...products
      ];

      // Add header row
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:ZZ1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });

      // Format header row (same styling as quotation/invoice)
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: newSheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: 4,
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true, fontSize: 10 },
                    backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                    wrapStrategy: 'CLIP',
                    verticalAlignment: 'MIDDLE',
                  },
                },
                fields: 'userEnteredFormat(textFormat,backgroundColor,wrapStrategy,verticalAlignment)',
              },
            },
            {
              repeatCell: {
                range: {
                  sheetId: newSheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 4,
                  endColumnIndex: 5,
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true, fontSize: 10 },
                    backgroundColor: { red: 0.8, green: 0.9, blue: 1.0 },
                    wrapStrategy: 'CLIP',
                    verticalAlignment: 'MIDDLE',
                  },
                },
                fields: 'userEnteredFormat(textFormat,backgroundColor,wrapStrategy,verticalAlignment)',
              },
            },
            {
              repeatCell: {
                range: {
                  sheetId: newSheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 5,
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true, fontSize: 10 },
                    backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                    wrapStrategy: 'CLIP',
                    verticalAlignment: 'MIDDLE',
                  },
                },
                fields: 'userEnteredFormat(textFormat,backgroundColor,wrapStrategy,verticalAlignment)',
              },
            },
            {
              updateDimensionProperties: {
                range: { sheetId: newSheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
                properties: { pixelSize: 42 },
                fields: 'pixelSize',
              },
            },
            {
              updateDimensionProperties: {
                range: { sheetId: newSheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 },
                properties: { pixelSize: 110 },
                fields: 'pixelSize',
              },
            },
            {
              updateDimensionProperties: {
                range: { sheetId: newSheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 },
                properties: { pixelSize: 140 },
                fields: 'pixelSize',
              },
            },
            {
              updateDimensionProperties: {
                range: { sheetId: newSheetId, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 },
                properties: { pixelSize: 80 },
                fields: 'pixelSize',
              },
            },
            {
              updateDimensionProperties: {
                range: { sheetId: newSheetId, dimension: 'COLUMNS', startIndex: 3, endIndex: 4 },
                properties: { pixelSize: 70 },
                fields: 'pixelSize',
              },
            },
            {
              updateDimensionProperties: {
                range: { sheetId: newSheetId, dimension: 'COLUMNS', startIndex: 4, endIndex: 5 },
                properties: { pixelSize: 100 },
                fields: 'pixelSize',
              },
            },
            {
              updateDimensionProperties: {
                range: { sheetId: newSheetId, dimension: 'COLUMNS', startIndex: 5, endIndex: 5 + products.length },
                properties: { pixelSize: 75 },
                fields: 'pixelSize',
              },
            },
            {
              updateSheetProperties: {
                properties: { sheetId: newSheetId, gridProperties: { frozenRowCount: 1 } },
                fields: 'gridProperties.frozenRowCount',
              },
            },
          ],
        },
      });
    }

    return sheetName;
  } catch (error) {
    console.error('Error ensuring expense sheet exists:', error);
    return null;
  }
}

// Find row index by Expense ID
async function findExpenseRowIndex(sheets: any, spreadsheetId: string, sheetName: string, expenseId: string): Promise<number | null> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
    });

    const values = response.data.values || [];
    const rowIndex = values.findIndex((row: any[]) => row[0] === expenseId);
    
    return rowIndex > 0 ? rowIndex + 1 : null;
  } catch (error) {
    console.error('Error finding expense row:', error);
    return null;
  }
}

// Log expense to Google Sheets
export async function logExpenseToSheets(expense: any) {
  try {
    const sheets = getGoogleSheetsClient();
    if (!sheets) {
      console.warn('Google Sheets client not available');
      return false;
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      console.warn('GOOGLE_SHEET_ID not set in environment variables');
      return false;
    }

    // Only log if status is "final"
    if (expense.status !== 'final') {
      console.log(`Skipping log - expense status is "${expense.status}"`);
      return false;
    }

    const year = new Date(expense.productionDate).getFullYear();
    
    const sheetName = await ensureExpenseSheetExists(sheets, spreadsheetId, year);
    if (!sheetName) return false;

    const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = sheetInfo.data.sheets.find((s: any) => s.properties.title === sheetName);
    const sheetId = sheet?.properties.sheetId;

    const allProducts = await getAllProducts();

    // Calculate product totals from expense items
    const productTotals: Record<string, number> = {};
    allProducts.forEach(productName => {
      productTotals[productName] = 0;
    });

    if (expense.items) {
      expense.items.forEach((item: any) => {
        if (productTotals.hasOwnProperty(item.productName)) {
          productTotals[item.productName] += parseFloat(item.expense) || 0;
        }
      });
    }

    // Prepare row data
    const rowData = [
      expense.expenseId,
      expense.projectName,
      expense.status,
      new Date(expense.productionDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
      Math.round(expense.totalExpense),
      ...allProducts.map(productName => productTotals[productName] || 0)
    ];

    const existingRowIndex = await findExpenseRowIndex(sheets, spreadsheetId, sheetName, expense.expenseId);

    if (existingRowIndex) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A${existingRowIndex}:ZZ${existingRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData],
        },
      });
      
      if (sheetId !== undefined) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                repeatCell: {
                  range: {
                    sheetId: sheetId,
                    startRowIndex: existingRowIndex - 1,
                    endRowIndex: existingRowIndex,
                    startColumnIndex: 0,
                  },
                  cell: {
                    userEnteredFormat: {
                      textFormat: { bold: false, fontSize: 10 },
                      backgroundColor: { red: 1, green: 1, blue: 1 },
                    },
                  },
                  fields: 'userEnteredFormat(textFormat,backgroundColor)',
                },
              },
            ],
          },
        });
      }
      
      console.log(`✅ Updated expense in Google Sheets: ${expense.expenseId}`);
    } else {
      const appendResult = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A2:ZZ`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData],
        },
      });
      
      const updatedRange = appendResult.data.updates.updatedRange;
      const rowMatch = updatedRange.match(/!A(\d+):/);
      if (rowMatch && sheetId !== undefined) {
        const newRowIndex = parseInt(rowMatch[1]);
        
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                repeatCell: {
                  range: {
                    sheetId: sheetId,
                    startRowIndex: newRowIndex - 1,
                    endRowIndex: newRowIndex,
                    startColumnIndex: 0,
                  },
                  cell: {
                    userEnteredFormat: {
                      textFormat: { bold: false, fontSize: 10 },
                      backgroundColor: { red: 1, green: 1, blue: 1 },
                    },
                  },
                  fields: 'userEnteredFormat(textFormat,backgroundColor)',
                },
              },
            ],
          },
        });
      }
      
      console.log(`✅ Added new expense to Google Sheets: ${expense.expenseId}`);
    }

    return true;
  } catch (error) {
    console.error('Error logging expense to Google Sheets:', error);
    return false;
  }
}

// Delete expense row from Google Sheets
export async function deleteExpenseFromSheets(expenseId: string, productionDate: Date) {
  try {
    const sheets = getGoogleSheetsClient();
    if (!sheets) {
      console.warn('Google Sheets client not available');
      return false;
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      console.warn('GOOGLE_SHEET_ID not set in environment variables');
      return false;
    }

    const year = new Date(productionDate).getFullYear();
    const sheetName = `EXPENSE ${year}`;

    const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = sheetInfo.data.sheets.find((s: any) => s.properties.title === sheetName);
    if (!sheet) {
      console.warn(`Sheet ${sheetName} not found`);
      return false;
    }
    const sheetId = sheet.properties.sheetId;

    const existingRowIndex = await findExpenseRowIndex(sheets, spreadsheetId, sheetName, expenseId);
    if (!existingRowIndex) {
      console.warn(`Expense ${expenseId} not found in sheet`);
      return false;
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: existingRowIndex - 1,
                endIndex: existingRowIndex,
              },
            },
          },
        ],
      },
    });

    console.log(`✅ Deleted expense row from Google Sheets: ${expenseId}`);
    return true;
  } catch (error) {
    console.error('Error deleting expense from Google Sheets:', error);
    return false;
  }
}

