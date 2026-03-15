import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || '';
const sqlClient = postgres(DATABASE_URL);

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Invalid SQL query' },
        { status: 400 }
      );
    }

    try {
      const result = await sqlClient.unsafe(query);
      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Query execution failed' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Query error:', error);
    return NextResponse.json(
      { error: 'Failed to execute query' },
      { status: 500 }
    );
  }
}

