const SUPABASE_URL = "https://cxxlsapgodwckrhkbwpo.supabase.co";
const SUPABASE_KEY = "sb_publishable_myoZQmhn0sAEgkvLkRGoFQ_u18JJjPm";

function pegarValor(nome) {
  const selecionado = document.querySelector(`input[name="${nome}"]:checked`);
  return selecionado ? selecionado.value : null;
}

function somenteNumeros(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function dataBrasil() {
  return new Date().toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" });
}

function horaBrasil() {
  return new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Fortaleza" });
}

function mostrarErro(mensagem) {
  alert(mensagem);
  console.error(mensagem);
}

async function gerarResultado() {
  const botao = document.querySelector("button[onclick='gerarResultado()']");
  if (botao) {
    botao.disabled = true;
    botao.innerText = "Gerando diagnóstico...";
  }

  try {
    const nome = document.getElementById("nome").value.trim();
    const whatsapp = document.getElementById("whatsapp").value.trim();
    const serie = document.getElementById("serie").value;
    const meta = document.getElementById("meta").value;

    const respostas = {
      redacao: pegarValor("redacao"),
      matematica: pegarValor("matematica"),
      interpretacao: pegarValor("interpretacao"),
      fisica: pegarValor("fisica"),
      quimica: pegarValor("quimica")
    };

    if (!nome || !whatsapp || !serie || !meta) {
      mostrarErro("Preencha nome, WhatsApp, série/ano e objetivo principal.");
      return;
    }

    const whatsappLimpo = somenteNumeros(whatsapp);
    if (whatsappLimpo.length < 10) {
      mostrarErro("Digite um WhatsApp válido com DDD.");
      return;
    }

    for (let area in respostas) {
      if (!respostas[area]) {
        mostrarErro("Responda todas as perguntas para gerar o diagnóstico.");
        return;
      }
    }

    const pontos = {
      redacao: 0,
      matematica: 0,
      interpretacao: 0,
      fisica: 0,
      quimica: 0
    };

    Object.keys(respostas).forEach(area => {
      if (respostas[area] !== "ok") {
        pontos[area] += 2;
      }
    });

    const ranking = Object.entries(pontos)
      .sort((a, b) => b[1] - a[1])
      .map(item => item[0]);

    const areaPrincipal = ranking[0];
    const areaSecundaria = ranking[1];
    const areaTerciaria = ranking[2];

    const totalErros = Object.values(pontos).reduce((a, b) => a + b, 0);

    let preparo = 100 - (totalErros * 10);
    if (preparo < 10) preparo = 10;

    let nivel = "Avançado";
    if (preparo < 50) {
      nivel = "Iniciante";
    } else if (preparo < 70) {
      nivel = "Intermediário";
    }

    const trilhas = {
      redacao: "Redação (tema, estrutura e argumentação)",
      matematica: "Matemática (funções, sistemas e interpretação)",
      interpretacao: "Interpretação (pegadinhas e leitura)",
      fisica: "Física (dinâmica e aplicação)",
      quimica: "Química (estequiometria e cálculo)"
    };

    const nomes = {
      redacao: "Redação",
      matematica: "Matemática",
      interpretacao: "Interpretação",
      fisica: "Física",
      quimica: "Química"
    };

    const areasComErro = ranking.filter(area => pontos[area] > 0);

    const listaAreas = areasComErro.length
      ? areasComErro.map(area => nomes[area]).join(", ")
      : "Revisão geral";

    const resultadoFinal = {
      nome,
      whatsapp: whatsappLimpo,
      serie,
      meta,
      areaPrincipal,
      areaSecundaria,
      areaTerciaria,
      ranking,
      trilhaPrincipal: trilhas[areaPrincipal],
      trilhaCombinada: `${trilhas[areaPrincipal]} + ${trilhas[areaSecundaria]}`,
      areas: listaAreas,
      preparo,
      nivel,
      data: dataBrasil(),
      hora: horaBrasil()
    };

    localStorage.setItem("matrizResultado", JSON.stringify(resultadoFinal));

    const salvou = await salvarLeadSupabase(resultadoFinal);

    if (!salvou) {
      mostrarErro("Diagnóstico gerado, mas não salvou no banco. Verifique Supabase.");
      return;
    }

    window.location.href = "resultado.html";

  } catch (erro) {
    console.error(erro);
    mostrarErro("Erro ao gerar diagnóstico.");
  } finally {
    if (botao) {
      botao.disabled = false;
      botao.innerText = "Gerar diagnóstico personalizado";
    }
  }
}

async function salvarLeadSupabase(dados) {
  const lead = {
    nome: dados.nome,
    whatsapp: dados.whatsapp,
    serie: dados.serie,
    meta: dados.meta,
    nivel: dados.nivel,
    preparo: dados.preparo,
    area_principal: dados.areaPrincipal,
    areas: dados.areas || "Revisão geral",
    data: dados.data,
    hora: dados.hora
  };

  try {
    const resposta = await fetch(`${SUPABASE_URL}/rest/v1/leads_matriz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Prefer": "return=representation"
      },
      body: JSON.stringify(lead)
    });

    if (!resposta.ok) {
      const erroTexto = await resposta.text();
      console.error("Erro Supabase:", erroTexto);
      return false;
    }

    return true;

  } catch (erro) {
    console.error("Erro conexão:", erro);
    return false;
  }
}