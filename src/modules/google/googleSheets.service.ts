import { google, sheets_v4 } from 'googleapis';
import { db } from '../../database/db';
import { ImportModule } from '../import-export/importExport.service';

const REQUIRED_SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

// Helper functions for database operations
const dbAll = (query: string, params: any[]): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

const getSheetsClient = async (): Promise<sheets_v4.Sheets> => {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('GOOGLE_SHEETS_CREDENTIALS_MISSING');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: REQUIRED_SCOPES,
  });

  await auth.authorize();
  return google.sheets({ version: 'v4', auth });
};

export const readSheetRange = async (spreadsheetId: string, range: string) => {
  const sheets = await getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values || [];
  const [header, ...dataRows] = rows;

  if (!header) {
    return [];
  }

  return dataRows.map((row) =>
    header.reduce<Record<string, any>>((acc, column, index) => {
      acc[column] = row[index] ?? '';
      return acc;
    }, {}),
  );
};

export const getModuleSnapshot = async (module: ImportModule) => {
  switch (module) {
    case 'customers':
      return dbAll(
        `SELECT id, name, type, status, customer_model as customerModel, score, phone, email
         FROM customers`,
        []
      );
    case 'deals':
      return dbAll(
        `SELECT id, title, stage, probability, budget, account_id as accountId
         FROM deals`,
        []
      );
    case 'coachingPrograms':
      return dbAll(
        `SELECT id, program_type as programType, status, account_id as accountId, coach_id as coachId
         FROM coaching_programs`,
        []
      );
    case 'contentItems':
      return dbAll(
        `SELECT id, title, content_type as contentType, status, publish_date as publishDate
         FROM content_items`,
        []
      );
    default:
      throw new Error('MODULE_NOT_SUPPORTED');
  }
};
