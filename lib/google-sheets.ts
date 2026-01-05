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

// Get all products from master data
async function getAllProducts() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' }
    });
    return products.map(p => p.name);
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

// Ensure sheet exists with proper headers
async function ensureQuotationSheetExists(sheets: any, spreadsheetId: string, year: number) {
  const sheetName = `Quotation ${year}`;
  
  try {
    const response = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = response.data.sheets.some(
      (sheet: any) => sheet.properties.title === sheetName
    );

    if (!sheetExists) {
      // Create sheet
      await sheets.spreadsheets.batchUpdate({
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

      // Get all products and create headers
      const products = await getAllProducts();
      const headers = [
        'ID',
        'Bill To',
        'Status',
        'Production Date',
        'Total Amount (after PPH)',
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

      // Format header row (bold, freeze)
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: response.data.sheets.find((s: any) => s.properties.title === sheetName)?.properties.sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true },
                    backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                  },
                },
                fields: 'userEnteredFormat(textFormat,backgroundColor)',
              },
            },
            {
              updateSheetProperties: {
                properties: {
                  sheetId: response.data.sheets.find((s: any) => s.properties.title === sheetName)?.properties.sheetId,
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

// Find row index by Quotation ID
async function findQuotationRowIndex(sheets: any, spreadsheetId: string, sheetName: string, quotationId: string): Promise<number | null> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
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
      new Date(quotation.productionDate).toISOString().split('T')[0],
      quotation.totalAmount,
      ...allProducts.map(productName => productTotals[productName] || 0)
    ];

    // Check if quotation already exists in sheet
    const existingRowIndex = await findQuotationRowIndex(sheets, spreadsheetId, sheetName, quotation.quotationId);

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
      console.log(`✅ Updated quotation in Google Sheets: ${quotation.quotationId}`);
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:ZZ`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData],
        },
      });
      console.log(`✅ Added new quotation to Google Sheets: ${quotation.quotationId}`);
    }

    return true;
  } catch (error) {
    console.error('Error logging quotation to Google Sheets:', error);
    return false;
  }
}
