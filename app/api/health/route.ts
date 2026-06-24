import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Extrai a chave de segurança do header
  const apiKey = request.headers.get('x-api-key');

  // Validação de segurança: Protege o endpoint contra acessos externos não autorizados
  if (!process.env.HEALTH_CHECK_KEY || apiKey !== process.env.HEALTH_CHECK_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized Access' }, 
      { status: 401 }
    );
  }

  // Resposta de monitoramento completa
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '7.0.0-enterprise',
    environment: process.env.NODE_ENV || 'production'
  }, { status: 200 });
}
