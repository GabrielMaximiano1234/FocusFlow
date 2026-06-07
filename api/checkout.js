const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_51MockKeyPlaceholder');

module.exports = async (req, res) => {
  // Configurações de CORS para integração sem problemas
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  try {
    const { planId, customerEmail } = req.body;

    let planName = '';
    let planPriceCents = 0;
    let planDesc = '';

    if (planId === 'alpha') {
      planName = 'Concentração Alfa';
      planPriceCents = 990; // R$ 9,90
      planDesc = 'Acesso a Pomodoro customizável, mini-jogos e Modo Relax';
    } else if (planId === 'pro') {
      planName = 'Mestre de Foco';
      planPriceCents = 1990; // R$ 19,90
      planDesc = 'Tudo do plano Alfa mais Assistente de Recomendação Diária';
    } else {
      res.status(400).json({ error: 'Plano inválido' });
      return;
    }

    const origin = req.headers.origin || 'http://localhost:8080';

    // Cria a sessão de Checkout do Stripe usando price_data dinâmico
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: planName,
              description: planDesc,
            },
            unit_amount: planPriceCents,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/index.html?payment_success=true&plan=${planId}`,
      cancel_url: `${origin}/index.html?payment_cancelled=true`,
      customer_email: customerEmail || undefined,
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Erro na criação de checkout Stripe:', error);
    res.status(500).json({ error: error.message });
  }
};
