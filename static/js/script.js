const $ = (id) => document.getElementById(id);

// ========================================
// LOGIN
// ========================================

$("loginForm").onsubmit = async (e) => {
  e.preventDefault();

  const loginBtn = document.querySelector(".btn-login");
  const originalText = loginBtn.innerHTML;
  loginBtn.disabled = true;
  loginBtn.classList.add("loading");
  loginBtn.innerHTML = '<span class="btn-text">Autenticando</span>';

  const errorEl = $("loginError");
  if (errorEl) errorEl.classList.remove("show");

  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: $("username").value,
        senha: $("password").value,
      }),
    });

    if (!res.ok) {
      if (errorEl) {
        errorEl.classList.add("show");
        setTimeout(() => errorEl.classList.remove("show"), 5000);
      }
      loginBtn.disabled = false;
      loginBtn.classList.remove("loading");
      loginBtn.innerHTML = originalText;
      return;
    }

    loginBtn.classList.remove("loading");
    loginBtn.innerHTML =
      '<span class="btn-text">✓ &nbsp;Acesso autorizado</span>';

    setTimeout(() => {
      $("loginScreen").style.opacity = "0";
      $("loginScreen").style.transition = "opacity 0.6s ease-out";
      setTimeout(() => {
        $("loginScreen").style.display = "none";
        $("mainSystem").style.display = "block";
        dashboard();
        produtos();
      }, 600);
    }, 700);
  } catch (err) {
    loginBtn.disabled = false;
    loginBtn.classList.remove("loading");
    loginBtn.innerHTML = originalText;
    if (errorEl) errorEl.classList.add("show");
  }
};

// ========================================
// LOGOUT
// ========================================

document.addEventListener("DOMContentLoaded", () => {
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await fetch("/logout");
      } catch (_) {}

      const main = document.getElementById("mainSystem");
      main.style.opacity = "0";
      main.style.transition = "opacity 0.4s ease";
      setTimeout(() => {
        main.style.display = "none";
        main.style.opacity = "";
        main.style.transition = "";

        const u = document.getElementById("username");
        const p = document.getElementById("password");
        if (u) u.value = "";
        if (p) p.value = "";

        const err = document.getElementById("loginError");
        if (err) err.classList.remove("show");

        const login = document.getElementById("loginScreen");
        login.style.display = "flex";
        login.style.opacity = "0";
        login.style.transition = "opacity 0.4s ease";
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            login.style.opacity = "1";
          });
        });
        setTimeout(() => {
          login.style.transition = "";
        }, 400);
      }, 400);
    });
  }
});

// ========================================
// NAVEGAÇÃO
// ========================================

function showSection(id) {
  document
    .querySelectorAll(".content-section")
    .forEach((s) => (s.style.display = "none"));

  const target = $(id);
  if (target) target.style.display = "block";
}

// ========================================
// MODAIS
// ========================================

const openModal = (id) => {
  $(id).style.display = "flex";
};

const closeModal = (id) => {
  $(id).style.display = "none";
};

// ========================================
// DASHBOARD
// ========================================

let meuGrafico = null;

async function dashboard() {
  const r = await fetch("/api/dashboard");
  const d = await r.json();

  $("stat-perfumes").innerText = d.total_produtos;
  $("stat-clientes").innerText = d.total_clientes;
  $("stat-vendas").innerText = d.total_vendas;

  const coresCategoria = {
    "Perfume Masculino": "#8B4513",
    "Perfume Feminino": "#D4A574",
    "Perfume Unissex": "#C6A16E",
    Hidratantes: "#E8B4A0",
    "Body splash": "#DAA520",
    Maquiagens: "#CD853F",
    Skincare: "#BC8F8F",
    "Cosméticos em geral": "#A0826D",
  };

  $("ultimasVendasBody").innerHTML = (d.ultimas_vendas || [])
    .map((v) => {
      const corCategoria = coresCategoria[v.produto_categoria] || "#C6A16E";
      return `
      <tr style="border-bottom: 1px solid #f0f0f0; transition: background-color 0.3s ease;" onmouseover="this.style.backgroundColor='#f9f7f5'" onmouseout="this.style.backgroundColor='transparent'">
        <td style="padding: 14px 12px; color: #333;">${v.cliente_nome}</td>
        <td style="padding: 14px 12px; color: #333;">${v.produto_nome}</td>
        <td style="padding: 14px 12px;">
          <span class="categoria-badge" style="background-color: ${corCategoria}; color: white; padding: 8px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; display: inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-transform: uppercase; letter-spacing: 0.5px;">
            ${v.produto_categoria}
          </span>
        </td>
        <td style="padding: 14px 12px; color: #5A4033; font-weight: 600;">R$ ${v.preco_final.toFixed(2)}</td>
        <td style="padding: 14px 12px; color: #999; font-size: 0.9rem;">${v.data_venda.split(" ")[0]}</td>
      </tr>
    `;
    })
    .join("");

  const ctx = $("categoriasChart");
  if (!ctx) return;

  if (meuGrafico) {
    meuGrafico.destroy();
  }

  const labels =
    d.categorias_vendas && d.categorias_vendas.length > 0
      ? d.categorias_vendas.map((c) => c.categoria)
      : ["Sem dados"];
  const dataValues =
    d.categorias_vendas && d.categorias_vendas.length > 0
      ? d.categorias_vendas.map((c) => c.total)
      : [0];

  const cores = [
    "#C6A16E",
    "#D4A574",
    "#E8B4A0",
    "#5A4033",
    "#8B4513",
    "#CD853F",
    "#DAA520",
    "#BC8F8F",
    "#A0826D",
    "#B8860B",
  ];

  meuGrafico = new Chart(ctx.getContext("2d"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Quantidade de Vendas",
          data: dataValues,
          backgroundColor: cores.slice(0, labels.length),
          borderColor: "#5A4033",
          borderWidth: 0,
          borderRadius: 12,
          hoverBackgroundColor: "#5A4033",
          hoverBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            font: { size: 12, weight: "bold" },
            color: "#5A4033",
            padding: 15,
          },
        },
        tooltip: {
          backgroundColor: "rgba(90, 64, 51, 0.9)",
          titleFont: { size: 13, weight: "bold" },
          bodyFont: { size: 12 },
          padding: 12,
          borderRadius: 8,
          displayColors: true,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            display: true,
            color: "rgba(200, 200, 200, 0.1)",
            drawBorder: false,
          },
          ticks: {
            stepSize: 1,
            font: { size: 11 },
            color: "#666",
          },
        },
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 11, weight: "500" },
            color: "#5A4033",
          },
        },
      },
    },
  });
}

// ========================================
// LISTAR PRODUTOS
// ========================================

async function produtos() {
  const r = await fetch("/api/produtos");
  const data = await r.json();

  $("perfumesBody").innerHTML = data
    .map(
      (p) => `
    <tr>
        <td>
            <img src="static/img/produtos/${p.imagem}" class="produto-img">
        </td>
        <td>${p.nome}</td>
        <td>R$ ${p.preco}</td>
        <td>${p.estoque}</td>
        <td>${p.marca}</td>
        <td>${p.categoria}</td>
        <td>${p.descricao}</td>
        <td style="white-space: nowrap;">
            <div style="display: flex; gap: 8px; justify-content: center;">
                <button class="btn-deletar" onclick="deletar(${p.id_produto})">Excluir</button>
                <button class="btn-editar" onclick="editar(${p.id_produto})">Editar</button>
            </div>
        </td>
    </tr>
    `,
    )
    .join("");
}

// ========================================
// CADASTRAR / EDITAR PRODUTOS
// ========================================

let editandoId = null;

$("perfumeForm").onsubmit = async (e) => {
  e.preventDefault();

  const nome = $("pNome").value.trim();
  const preco = parseFloat($("pPreco").value);
  const SkinnerEstoque = $("pEstoque").value;
  const estoque = parseInt(SkinnerEstoque);
  const marca = $("pMarca").value.trim();
  const categoria = $("pCategoria").value;
  const descricao = $("pDescricao").value.trim();

  if (!nome) {
    alert("Por favor, insira o nome do produto.");
    $("pNome").focus();
    return;
  }
  if (isNaN(preco) || preco <= 0) {
    alert("Por favor, insira um preço válido.");
    $("pPreco").focus();
    return;
  }
  if (isNaN(estoque) || estoque < 0) {
    alert("Por favor, insira uma quantidade de estoque válida.");
    $("pEstoque").focus();
    return;
  }
  if (!marca) {
    alert("Por favor, insira a marca.");
    $("pMarca").focus();
    return;
  }
  if (!categoria) {
    alert("Por favor, selecione uma categoria.");
    $("pCategoria").focus();
    return;
  }
  if (!descricao) {
    alert("Por favor, insira uma descrição.");
    $("pDescricao").focus();
    return;
  }

  const formData = new FormData();
  formData.append("nome", nome);
  formData.append("preco", preco);
  formData.append("estoque", estoque);
  formData.append("marca", marca);
  formData.append("categoria", categoria);
  formData.append("descricao", descricao);
  formData.append("imagem", $("pImagem").value);

  const fileInput = $("pImagemArquivo");
  if (fileInput && fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const validExtensions = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!validExtensions.includes(file.type)) {
      alert("Por favor, selecione uma imagem válida (JPEG, PNG, GIF ou WebP).");
      return;
    }
    formData.append("imagem_arquivo", file);
  }

  try {
    const url = editandoId ? "/api/produtos/" + editandoId : "/api/produtos";
    const method = editandoId ? "PUT" : "POST";

    const response = await fetch(url, {
      method: method,
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Erro ao salvar produto.");
    }

    alert(editandoId ? "Produto updated!" : "Produto cadastrado!");
    editandoId = null;
    e.target.reset();
    closeModal("perfumeModal");
    await produtos();
    await dashboard();
  } catch (error) {
    alert("Erro: " + error.message);
  }
};

// ========================================
// DELETAR PRODUTO
// ========================================

async function deletar(id) {
  if (
    confirm(
      "Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.",
    )
  ) {
    try {
      const response = await fetch("/api/produtos/" + id, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erro ao excluir produto.");
      }

      alert("Produto excluído!");
      await produtos();
      await dashboard();
    } catch (error) {
      alert("Erro: " + error.message);
    }
  }
}

// ========================================
// EDITAR PRODUTO
// ========================================

async function editar(id) {
  const r = await fetch("/api/produtos");
  const produtosLista = await r.json();
  const produto = produtosLista.find((p) => p.id_produto == id);

  if (!produto) return;

  $("pNome").value = produto.nome;
  $("pPreco").value = produto.preco;
  $("pEstoque").value = produto.estoque;
  $("pMarca").value = produto.marca;
  $("pCategoria").value = produto.categoria;
  $("pImagem").value = produto.imagem;
  $("pDescricao").value = produto.descricao;

  editandoId = id;
  openModal("perfumeModal");
}

// ========================================
// CLIENTES
// ========================================

let editandoClienteId = null;

async function clientes() {
  const r = await fetch("/api/clientes");
  const data = await r.json();
  const sortedData = data.sort((a, b) => b.id_cliente - a.id_cliente);
  $("clientesBody").innerHTML = sortedData
    .map(
      (c) => `
    <tr>
        <td>${c.nome}</td>
        <td>${c.email}</td>
        <td>${c.senha}</td>
        <td style="white-space: nowrap;">
            <div style="display: flex; gap: 8px; justify-content: center;">
                <button class="btn-deletar" onclick="deletarCliente(${c.id_cliente})">Excluir</button>
                <button class="btn-editar" onclick="editarClienteFunc(${c.id_cliente})">Editar</button>
            </div>
        </td>
    </tr>
  `,
    )
    .join("");
}

async function editarClienteFunc(id) {
  const r = await fetch("/api/clientes");
  const clientes_list = await r.json();
  const cliente = clientes_list.find((c) => c.id_cliente == id);

  if (!cliente) return;

  editandoClienteId = cliente.id_cliente;
  $("cNome").value = cliente.nome;
  $("cEmail").value = cliente.email;
  $("cSenha").value = cliente.senha;
  openModal("clienteModal");
}

async function deletarCliente(id) {
  if (
    confirm(
      "Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.",
    )
  ) {
    try {
      const response = await fetch(`/api/clientes/${id}`, { method: "DELETE" });

      if (!response.ok) {
        throw new Error("Erro ao excluir cliente.");
      }

      alert("Cliente excluído!");
      await clientes();
      await dashboard();
    } catch (error) {
      alert("Erro: " + error.message);
    }
  }
}

$("clienteForm").onsubmit = async (e) => {
  e.preventDefault();

  const nome = $("cNome").value.trim();
  const email = $("cEmail").value.trim();
  const senha = $("cSenha").value;

  if (!nome) {
    alert("Por favor, insira o nome completo.");
    $("cNome").focus();
    return;
  }
  if (!email || !email.includes("@")) {
    alert("Por favor, insira um e-mail válido.");
    $("cEmail").focus();
    return;
  }
  if (!senha || senha.length < 4) {
    alert("Por favor, insira uma senha com pelo menos 4 caracteres.");
    $("cSenha").focus();
    return;
  }

  const dados = { nome: nome, email: email, senha: senha };

  try {
    const url = editandoClienteId
      ? `/api/clientes/${editandoClienteId}`
      : "/api/clientes";
    const method = editandoClienteId ? "PUT" : "POST";

    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });

    if (!response.ok) {
      throw new Error("Erro ao salvar cliente.");
    }

    alert(editandoClienteId ? "Cliente atualizado!" : "Cliente cadastrado!");
    editandoClienteId = null;
    e.target.reset();
    closeModal("clienteModal");
    await clientes();
    await dashboard();
  } catch (error) {
    alert("Erro: " + error.message);
  }
};

// ========================================
// VENDAS E CARRINHO
// ========================================

let todosProdutos = [];
let carrinho = [];

async function carregarDadosVenda() {
  const resC = await fetch("/api/clientes");
  const clientesLista = await resC.json();
  $("vCliente").innerHTML =
    '<option value="">Selecione o Cliente</option>' +
    clientesLista
      .map((c) => `<option value="${c.id_cliente}">${c.nome}</option>`)
      .join("");

  const resP = await fetch("/api/produtos");
  todosProdutos = await resP.json();

  const categorias = [...new Set(todosProdutos.map((p) => p.categoria))];
  $("vCategoria").innerHTML =
    '<option value="">Selecione uma categoria primeiro...</option>' +
    categorias.map((c) => `<option value="${c}">${c}</option>`).join("");

  carrinho = [];
  atualizarCarrinhoUI();
}

$("vCategoria").onchange = () => {
  const cat = $("vCategoria").value;
  const filtrados = cat
    ? todosProdutos.filter((p) => p.categoria === cat)
    : todosProdutos;
  $("vPerfume").innerHTML =
    '<option value="">Selecione um produto...</option>' +
    filtrados
      .map(
        (p) =>
          `<option value="${p.id_produto}" data-preco="${p.preco}">${p.nome} (Estoque: ${p.estoque})</option>`,
      )
      .join("");
};

function adicionarAoCarrinho() {
  const select = $("vPerfume");
  const produtoId = select.value;

  if (!produtoId) {
    alert("Selecione um produto!");
    return;
  }

  // Captura e tratamento seguro do input de quantidade
  const qtd = parseInt($("vQuantidade").value) || 1;
  if (qtd < 1) {
    alert("A quantidade deve ser de pelo menos 1 unidade!");
    $("vQuantidade").value = 1;
    return;
  }

  const produto = todosProdutos.find((p) => p.id_produto == produtoId);

  // Localiza se o item já está no carrinho para calcular o limite real
  const itemExistente = carrinho.find((item) => item.id_produto == produtoId);
  const qtdJaNoCarrinho = itemExistente ? itemExistente.quantidade : 0;
  const qtdTotalDesejada = qtdJaNoCarrinho + qtd;

  // Validação baseada no estoque físico disponível
  if (qtdTotalDesejada > produto.estoque) {
    const restanteMaximo = produto.estoque - qtdJaNoCarrinho;
    if (restanteMaximo > 0) {
      alert(
        `Quantidade indisponível! Você já tem ${qtdJaNoCarrinho} no carrinho. Só é possível adicionar mais ${restanteMaximo} unidades.`,
      );
      $("vQuantidade").value = restanteMaximo;
    } else {
      alert("Limite de estoque atingido para este produto no carrinho!");
      $("vQuantidade").value = 1;
    }
    return;
  }

  // Inserção ou incremento no array do carrinho
  if (itemExistente) {
    itemExistente.quantidade = qtdTotalDesejada;
  } else {
    carrinho.push({
      id_produto: produto.id_produto,
      nome: produto.nome,
      preco: produto.preco,
      quantidade: qtd,
      categoria: produto.categoria,
    });
  }

  $("vQuantidade").value = 1;
  atualizarCarrinhoUI();
}

function atualizarCarrinhoUI() {
  const container = $("carrinhoItens");
  const badge = $("cartBadge");

  if (carrinho.length === 0) {
    container.innerHTML = `
      <div class="cart-empty" id="carrinhoVazio">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="19" stroke="rgba(198,161,110,0.3)" stroke-width="1.5"/>
          <path d="M13 16h14l-2 10H15L13 16z" stroke="rgba(198,161,110,0.5)" stroke-width="1.2" fill="none" stroke-linejoin="round"/>
          <path d="M10 13h3l1.5 3" stroke="rgba(198,161,110,0.5)" stroke-width="1.2" stroke-linecap="round"/>
          <circle cx="16" cy="28" r="1.2" fill="rgba(198,161,110,0.5)"/>
          <circle cx="22" cy="28" r="1.2" fill="rgba(198,161,110,0.5)"/>
        </svg>
        <p>Carrinho vazio</p>
      </div>`;
    if ($("cartSubtotal")) $("cartSubtotal").innerText = "R$ 0,00";
    if ($("cartTotal")) $("cartTotal").innerText = "R$ 0,00";
    if (badge) badge.textContent = "0";
    return;
  }

  let total = 0;
  container.innerHTML = carrinho
    .map((item, index) => {
      const subtotal = item.preco * item.quantidade;
      total += subtotal;
      return `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.nome}</div>
          <div class="cart-item-qty">${item.quantidade}x · R$ ${parseFloat(item.preco).toFixed(2)}</div>
        </div>
        <div class="cart-item-price">R$ ${subtotal.toFixed(2)}</div>
        <button class="cart-item-remove" type="button" onclick="removerDoCarrinho(${index})" title="Remover">✕</button>
      </div>
    `;
    })
    .join("");

  if ($("cartSubtotal")) $("cartSubtotal").innerText = `R$ ${total.toFixed(2)}`;
  if ($("cartTotal")) $("cartTotal").innerText = `R$ ${total.toFixed(2)}`;
  if (badge) badge.textContent = carrinho.length;
}

function removerDoCarrinho(index) {
  carrinho.splice(index, 1);
  atualizarCarrinhoUI();
}

$("vendaForm").onsubmit = async (e) => {
  e.preventDefault();

  if (carrinho.length === 0) {
    alert("O carrinho está vazio!");
    return;
  }

  const idCliente = $("vCliente").value;
  if (!idCliente) {
    alert("Por favor, selecione um cliente.");
    return;
  }

  const statusVenda = $("vStatus").value;
  const totalGeral = parseFloat(
    $("cartTotal")
      .innerText.replace("R$ ", "")
      .replace(".", "")
      .replace(",", "."),
  );

  try {
    for (const item of carrinho) {
      const response = await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_cliente: idCliente,
          id_produto: item.id_produto,
          quantidade: item.quantidade,
          preco_final: item.preco * item.quantidade,
          status: statusVenda,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Erro ao registrar venda.");
      }
    }

    if ($("vGerarNota") && $("vGerarNota").checked) {
      gerarNotaFiscal(idCliente, totalGeral);
    }

    alert("Venda finalizada com sucesso!");

    e.target.reset();
    carrinho = [];
    atualizarCarrinhoUI();
    closeModal("vendaModal");

    // Atualizar dados do sistema global pós-sucesso
    await dashboard();
    await produtos();
    await vendas();
    await carregarDadosVenda();
  } catch (error) {
    alert("Falha ao registrar venda: " + error.message);
  }
};

function gerarNotaFiscal(idCliente, total) {
  const comboCliente = $("vCliente");
  const cliente = comboCliente.options[comboCliente.selectedIndex].text;
  const data = new Date().toLocaleString();

  let conteudo = `
    VALOURÉ PERFUMARIA - NOTA FISCAL
    --------------------------------
    Data: ${data}
    Cliente: ${cliente}
    --------------------------------
    ITENS:
  `;

  carrinho.forEach((item) => {
    conteudo += `\n${item.nome} - ${item.quantidade}x R$ ${item.preco} = R$ ${(item.preco * item.quantidade).toFixed(2)}`;
  });

  conteudo += `
    --------------------------------
    TOTAL: R$ ${total.toFixed(2)}
    --------------------------------
    Obrigado pela preferência!
  `;

  const win = window.open("", "Nota Fiscal", "width=400,height=600");
  if (win) {
    win.document.write("<pre>" + conteudo + "</pre>");
    win.document.write("<script>window.print();<\/script>");
  }
}

async function vendas() {
  const r = await fetch("/api/vendas");
  const data = await r.json();
  const tbody = $("vendasBody");
  if (!tbody) return;

  if ($("vsTotalVendas")) $("vsTotalVendas").innerText = data.length;
  if ($("vsReceita")) {
    const total = data.reduce((s, v) => s + parseFloat(v.preco_final || 0), 0);
    $("vsReceita").innerText = `R$ ${total.toFixed(2)}`;
  }
  if ($("vsUltima") && data.length > 0) {
    const d = new Date(data[0].data_venda);
    $("vsUltima").innerText = isNaN(d)
      ? data[0].data_venda
      : d.toLocaleDateString("pt-BR");
  }

  tbody.innerHTML = data
    .map((v) => {
      const status = v.status || "Concluído";
      const statusClass = status.toLowerCase().includes("conclu")
        ? "concluido"
        : "pendente";
      const dt = new Date(v.data_venda);
      const dataFmt = isNaN(dt)
        ? v.data_venda
        : dt.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
      return `
    <tr>
        <td>${dataFmt}</td>
        <td>${v.cliente_nome}</td>
        <td>${v.produto_nome}</td>
        <td style="text-align:center;">${v.quantidade}</td>
        <td>${v.produto_categoria}</td>
        <td>R$ ${parseFloat(v.preco_final).toFixed(2)}</td>
        <td><span class="status-badge ${statusClass}">${status}</span></td>
    </tr>
  `;
    })
    .join("");
}

// Stepper quantidade com validações integradas
function changeQty(delta) {
  const input = $("vQuantidade");
  const produtoId = $("vPerfume").value;
  const currentVal = parseInt(input.value) || 1;
  let newVal = currentVal + delta;

  if (newVal < 1) newVal = 1;

  if (produtoId) {
    const produto = todosProdutos.find((p) => p.id_produto == produtoId);
    if (produto) {
      const itemExistente = carrinho.find(
        (item) => item.id_produto == produtoId,
      );
      const qtdJaNoCarrinho = itemExistente ? itemExistente.quantidade : 0;
      const limiteMaximo = produto.estoque - qtdJaNoCarrinho;

      if (newVal > limiteMaximo) {
        alert(
          `Estoque máximo atingível para esta inserção: ${limiteMaximo} unidades.`,
        );
        newVal = limiteMaximo > 0 ? limiteMaximo : 1;
      }
    }
  }

  input.value = newVal;
}

// Evento disparado na digitação direta para proteção do estoque
document.addEventListener("DOMContentLoaded", () => {
  const inputQtd = $("vQuantidade");
  if (inputQtd) {
    inputQtd.addEventListener("input", (e) => {
      let val = parseInt(e.target.value) || 1;
      if (val < 1) val = 1;

      const produtoId = $("vPerfume").value;
      if (produtoId) {
        const produto = todosProdutos.find((p) => p.id_produto == produtoId);
        if (produto) {
          const itemExistente = carrinho.find(
            (item) => item.id_produto == produtoId,
          );
          const qtdJaNoCarrinho = itemExistente ? itemExistente.quantidade : 0;
          const limiteMaximo = produto.estoque - qtdJaNoCarrinho;

          if (val > limiteMaximo) {
            alert(
              `Quantidade ajustada para o teto disponível (${limiteMaximo} unidades).`,
            );
            val = limiteMaximo > 0 ? limiteMaximo : 1;
          }
        }
      }
      e.target.value = val;
    });
  }
});

// Inicialização das tabelas iniciais
window.onload = () => {
  clientes();
  vendas();
};

// Navegação entre painéis aprimorada
function showSectionEnhanced(id) {
  document
    .querySelectorAll(".content-section")
    .forEach((s) => (s.style.display = "none"));

  const section = $(id);
  if (section) {
    section.style.display = "block";

    if (id === "dashboard") dashboard();
    if (id === "perfumes") produtos();
    if (id === "clientes") clientes();
    if (id === "vendas") {
      vendas();
      carregarDadosVenda();
    }
  }
}

window.showSection = showSectionEnhanced;
