import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://zualrdvvlcoexqrbedhl.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1YWxyZHZ2bGNvZXhxcmJlZGhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MTYwMjMsImV4cCI6MjEwMDA5MjAyM30.1JgXhpQccIOxgFgvx_G7cBlnCkSiWQhEihUAd8xCyV8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TOOLS = [
  {
    name: 'get_financial_summary',
    description: 'ดึงสรุปภาพรวมรายรับ รายจ่าย กำไรสุทธิ และยอดรวมของร้านบ้านใหม่ ไออุ่น ตามช่วงวันที่ระบุ (ถ้าไม่ระบุจะดึงข้อมูล 30 วันล่าสุด)',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'วันเริ่มต้น รูปแบบ YYYY-MM-DD (เช่น 2026-08-01)' },
        endDate: { type: 'string', description: 'วันสิ้นสุด รูปแบบ YYYY-MM-DD (เช่น 2026-08-21)' }
      }
    }
  },
  {
    name: 'get_daily_sales',
    description: 'ดึงยอดขายรายวัน ยอดขายหน้าร้าน ยอดขายเดลิเวอรี และจำนวนรายการของร้านบ้านใหม่ ไออุ่น',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'วันที่ต้องการดูยอดขาย รูปแบบ YYYY-MM-DD (เช่น 2026-08-21) ถ้าไม่ระบุจะใช้วันนี้' },
        limit: { type: 'number', description: 'จำนวนวันที่ต้องการย้อนหลัง (ค่าเริ่มต้น: 7)' }
      }
    }
  },
  {
    name: 'get_expenses_by_category',
    description: 'ดึงสรุปค่าใช้จ่ายแยกตามหมวดหมู่ (เช่น เมล็ดกาแฟ, นม/ไซรัป, บรรจุภัณฑ์, ค่าจ้างพนักงาน, ค่าเช่า/ค่าน้ำไฟ)',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'วันเริ่มต้น รูปแบบ YYYY-MM-DD' },
        endDate: { type: 'string', description: 'วันสิ้นสุด รูปแบบ YYYY-MM-DD' }
      }
    }
  },
  {
    name: 'get_debt_status',
    description: 'ดึงสถานะหนี้สินและภาระผูกพันคงค้างของร้านบ้านใหม่ ไออุ่น พร้อมการจัดกลุ่มความเร่งด่วน (Q1-Q4)',
    inputSchema: {
      type: 'object',
      properties: {
        quadrant: { 
          type: 'string', 
          enum: ['all', 'q1', 'q2', 'q3', 'q4'],
          description: 'ระดับความสำคัญของหนี้สิน (q1=เร่งด่วนมาก/วิกฤต, q2=สำคัญแต่ไม่ด่วน, all=ทั้งหมด)' 
        }
      }
    }
  },
  {
    name: 'search_transactions',
    description: 'ค้นหารายการธุรกรรม (รายรับ/รายจ่าย) ตามคำค้นหา เช่น ชื่อสินค้า ซัพพลายเออร์ หรือหมายเหตุ',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'คำค้นหา เช่น "นม", "เมล็ดกาแฟ", "CP-Meiji", "ค่าไฟ"' },
        limit: { type: 'number', description: 'จำนวนรายการสูงสุดที่ต้องการดึง (ค่าเริ่มต้น: 20)' }
      },
      required: ['query']
    }
  },
  {
    name: 'record_transaction',
    description: 'บันทึกรายการรายรับหรือรายจ่ายใหม่เข้าสู่ระบบบัญชีร้านบ้านใหม่ ไออุ่น',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['income', 'expense'], description: 'ประเภทรายการ: income (รายรับ) หรือ expense (รายจ่าย)' },
        amount: { type: 'number', description: 'จำนวนเงิน (บาท)' },
        category: { 
          type: 'string', 
          description: 'หมวดหมู่ เช่น coffee_beans, dairy_syrup, packaging, bakery_food, rent, utilities, wages, pos_sales, delivery_sales, other_expense, other_income' 
        },
        description: { type: 'string', description: 'รายละเอียดรายการ' },
        date: { type: 'string', description: 'วันที่ทำรายการ รูปแบบ YYYY-MM-DD (ถ้าไม่ระบุจะใช้วันที่ปัจจุบัน)' },
        paymentMethod: { type: 'string', enum: ['transfer', 'cash', 'credit_card', 'qr'], description: 'ช่องทางการชำระเงิน' }
      },
      required: ['type', 'amount', 'category', 'description']
    }
  }
];

// Helper execution handlers
async function executeTool(name: string, args: any) {
  switch (name) {
    case 'get_financial_summary': {
      let query = supabase.from('transactions').select('*');
      if (args?.startDate) query = query.gte('date', args.startDate);
      if (args?.endDate) query = query.lte('date', args.endDate);

      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw new Error(`Supabase query error: ${error.message}`);

      let totalIncome = 0;
      let totalExpense = 0;
      let incomeCount = 0;
      let expenseCount = 0;

      (data || []).forEach((t: any) => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') {
          totalIncome += amt;
          incomeCount++;
        } else {
          totalExpense += amt;
          expenseCount++;
        }
      });

      const netProfit = totalIncome - totalExpense;
      const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(2) : '0.00';

      return {
        period: {
          startDate: args?.startDate || 'All-time',
          endDate: args?.endDate || 'All-time'
        },
        summary: {
          totalIncomeTHB: totalIncome,
          totalExpenseTHB: totalExpense,
          netProfitTHB: netProfit,
          profitMarginPercent: `${profitMargin}%`,
          totalIncomeTransactions: incomeCount,
          totalExpenseTransactions: expenseCount,
          status: netProfit >= 0 ? 'กำไร (Profitable)' : 'ขาดทุน (Loss)'
        }
      };
    }

    case 'get_daily_sales': {
      const limit = args?.limit || 7;
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('type', 'income');

      if (args?.date) {
        query = query.eq('date', args.date);
      }

      const { data, error } = await query.order('date', { ascending: false }).limit(limit * 50);
      if (error) throw new Error(`Supabase sales query error: ${error.message}`);

      const dailyMap: Record<string, { date: string; totalSales: number; posSales: number; deliverySales: number; count: number; items: any[] }> = {};

      (data || []).forEach((t: any) => {
        const d = t.date;
        if (!dailyMap[d]) {
          dailyMap[d] = { date: d, totalSales: 0, posSales: 0, deliverySales: 0, count: 0, items: [] };
        }
        const amt = Number(t.amount) || 0;
        dailyMap[d].totalSales += amt;
        dailyMap[d].count += 1;
        if (t.category === 'pos_sales') dailyMap[d].posSales += amt;
        else if (t.category === 'delivery_sales') dailyMap[d].deliverySales += amt;

        if (dailyMap[d].items.length < 5) {
          dailyMap[d].items.push({ description: t.description, amount: amt });
        }
      });

      return {
        dailySales: Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit)
      };
    }

    case 'get_expenses_by_category': {
      let query = supabase.from('transactions').select('*').eq('type', 'expense');
      if (args?.startDate) query = query.gte('date', args.startDate);
      if (args?.endDate) query = query.lte('date', args.endDate);

      const { data, error } = await query;
      if (error) throw new Error(`Supabase expense error: ${error.message}`);

      const catMap: Record<string, { category: string; totalAmount: number; count: number }> = {};
      let totalExpense = 0;

      (data || []).forEach((t: any) => {
        const cat = t.category || 'other_expense';
        const amt = Number(t.amount) || 0;
        totalExpense += amt;
        if (!catMap[cat]) {
          catMap[cat] = { category: cat, totalAmount: 0, count: 0 };
        }
        catMap[cat].totalAmount += amt;
        catMap[cat].count += 1;
      });

      const categories = Object.values(catMap)
        .map(c => ({
          ...c,
          percentOfTotal: totalExpense > 0 ? `${((c.totalAmount / totalExpense) * 100).toFixed(1)}%` : '0%'
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount);

      return {
        totalExpenseTHB: totalExpense,
        breakdownByCategory: categories
      };
    }

    case 'get_debt_status': {
      let query = supabase.from('debts').select('*');
      if (args?.quadrant && args.quadrant !== 'all') {
        query = query.eq('quadrant', args.quadrant);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw new Error(`Supabase debts error: ${error.message}`);

      let totalDebtAmount = 0;
      let totalRemainingAmount = 0;

      const debts = (data || []).map((d: any) => {
        const total = Number(d.total_amount || d.totalAmount || 0);
        const remaining = Number(d.remaining_amount || d.remainingAmount || 0);
        totalDebtAmount += total;
        totalRemainingAmount += remaining;
        return {
          id: d.id,
          title: d.title,
          creditor: d.creditor,
          totalAmount: total,
          remainingAmount: remaining,
          dueDate: d.due_date || d.dueDate,
          quadrant: d.quadrant,
          status: d.status
        };
      });

      return {
        totalDebtAmountTHB: totalDebtAmount,
        totalRemainingAmountTHB: totalRemainingAmount,
        debtCount: debts.length,
        debts
      };
    }

    case 'search_transactions': {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .ilike('description', `%${args.query}%`)
        .order('date', { ascending: false })
        .limit(args?.limit || 20);

      if (error) throw new Error(`Supabase search error: ${error.message}`);
      return {
        searchQuery: args.query,
        count: data?.length || 0,
        results: data || []
      };
    }

    case 'record_transaction': {
      const newId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const date = args.date || new Date().toISOString().split('T')[0];
      const newTx = {
        id: newId,
        date,
        type: args.type,
        amount: Number(args.amount),
        category: args.category,
        description: args.description,
        payment_method: args.paymentMethod || 'transfer',
        source: 'gemini_spark_mcp',
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('transactions').insert([newTx]);
      if (error) throw new Error(`Failed to record transaction: ${error.message}`);

      return {
        success: true,
        message: `บันทึกรายการ ${args.type === 'income' ? 'รายรับ' : 'รายจ่าย'} สำเร็จ: ${args.description} จำนวน ${args.amount} บาท`,
        transaction: newTx
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle SSE Connection or Info Check via GET
  if (req.method === 'GET') {
    const accept = req.headers['accept'] || '';
    if (accept.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.write(`event: endpoint\ndata: /api/mcp\n\n`);
      return;
    }

    return res.status(200).json({
      status: 'active',
      name: 'Baanmai Cafe Finance MCP Server',
      version: '1.0.0',
      description: 'Model Context Protocol server for Gemini Spark to access Cafe Finance & Sales Data',
      toolsCount: TOOLS.length,
      tools: TOOLS.map(t => ({ name: t.name, description: t.description })),
      oauth: {
        authorizeUrl: '/api/oauth/authorize',
        tokenUrl: '/api/oauth/token'
      }
    });
  }

  // Handle JSON-RPC 2.0 via POST
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { id, method, params } = body || {};

      if (!method) {
        return res.status(400).json({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request: Missing method' }, id: id || null });
      }

      // 1. Initialize Handshake
      if (method === 'initialize') {
        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: { listChanged: false },
              resources: {},
              prompts: {}
            },
            serverInfo: {
              name: 'baanmai-cafe-finance-mcp',
              version: '1.0.0'
            }
          }
        });
      }

      // 2. Initialized Notification
      if (method === 'notifications/initialized' || method === 'initialized') {
        return res.status(200).json({ jsonrpc: '2.0', result: {} });
      }

      // 3. Ping
      if (method === 'ping') {
        return res.status(200).json({ jsonrpc: '2.0', id, result: {} });
      }

      // 4. Tools List
      if (method === 'tools/list') {
        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: {
            tools: TOOLS
          }
        });
      }

      // 5. Tools Call
      if (method === 'tools/call') {
        const { name, arguments: toolArgs } = params || {};
        if (!name) {
          return res.status(400).json({
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Missing tool name' }
          });
        }

        try {
          const resultData = await executeTool(name, toolArgs || {});
          return res.status(200).json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(resultData, null, 2)
                }
              ],
              isError: false
            }
          });
        } catch (toolExecErr: any) {
          return res.status(200).json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `Tool Execution Error: ${toolExecErr.message}`
                }
              ],
              isError: true
            }
          });
        }
      }

      // 6. Prompts List
      if (method === 'prompts/list') {
        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: {
            prompts: [
              {
                name: 'daily_financial_brief',
                description: 'สรุปสถานะการเงิน รายรับ รายจ่าย และแจ้งเตือนหนี้สินประจำวันของร้านบ้านใหม่ ไออุ่น'
              }
            ]
          }
        });
      }

      // 7. Resources List
      if (method === 'resources/list') {
        return res.status(200).json({ jsonrpc: '2.0', id, result: { resources: [] } });
      }

      // Unhandled Method
      return res.status(200).json({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` }
      });
    } catch (err: any) {
      return res.status(500).json({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32603, message: `Internal server error: ${err.message}` }
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
