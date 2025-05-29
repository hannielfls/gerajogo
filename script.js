document.addEventListener('DOMContentLoaded', () => {
    // Elementos da UI
    const nomeJogadorInput = document.getElementById('nomeJogador');
    const gradeDezenasDiv = document.getElementById('gradeDezenas');
    const dezenasSelecionadasDisplay = document.getElementById('dezenasSelecionadasDisplay').querySelector('span');
    const btnGerarAleatorio = document.getElementById('btnGerarAleatorio');
    const btnLimparEscolhas = document.getElementById('btnLimparEscolhas');
    const btnSalvarJogo = document.getElementById('btnSalvarJogo');
    const mensagemFeedbackEl = document.getElementById('mensagemFeedback');
    
    const historicoGridDiv = document.getElementById('historicoGrid');
    const inputBuscaJogador = document.getElementById('buscaJogador');
    
    const totalJogosSpan = document.getElementById('totalJogos');
    const jogadoresUnicosSpan = document.getElementById('jogadoresUnicos');

    const painelMaisFrequentesUl = document.getElementById('listaMaisFrequentes');
    const painelMenosFrequentesUl = document.getElementById('listaMenosFrequentes');
    const mensagemDashboardVazioEl = document.getElementById('mensagemDashboardVazio');
    const dashboardAnaliseSectionPanels = document.getElementById('dashboardAnalise').querySelector('.frequency-panels');

    const analiseQuinaDisplayEl = document.getElementById('analiseQuinaDisplay');
    const notaSelecaoQuinaEl = document.getElementById('notaSelecaoQuina');
    const scoreQuinaBarEl = document.getElementById('scoreQuinaBar');
    const descricaoSelecaoQuinaEl = document.getElementById('descricaoSelecaoQuina');

    // --- Chave para localStorage ---
    const LOCAL_STORAGE_KEY_JOGOS = 'meusJogosLoteriaMasterApp';

    // Estado da Aplicação (carregado do localStorage ou inicializado)
    let dadosJogos = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_JOGOS)) || []; 
    let numerosSelecionados = [];
    let idEdicaoAtual = null;
    let termoBuscaAtual = '';

    const MIN_DEZENA = 1;
    const MAX_DEZENA = 80;
    const QTD_DEZENAS_ESCOLHER = 5;
    const MIN_CONFLICT_COUNT = 3;
    const TOP_N_FREQUENCIA = 10;

    const FREQUENCIAS_QUINA_FORNECIDAS = {
        4: 480, 52: 465, 49: 464, 26: 462, 44: 456, 31: 455, 53: 451, 15: 450, 39: 450, 16: 449,
        5: 447, 29: 446, 37: 444, 56: 443, 9: 441, 42: 441, 61: 440, 40: 440, 10: 440, 66: 439,
        13: 438, 18: 438, 38: 437, 33: 437, 72: 436, 73: 433, 70: 433, 54: 430, 14: 429, 60: 428,
        45: 426, 75: 426, 64: 425, 74: 424, 79: 424, 12: 423, 19: 422, 71: 421, 59: 421, 77: 421,
        6: 420, 43: 420, 55: 418, 78: 417, 11: 416, 51: 415, 46: 415, 34: 414, 76: 413, 62: 412,
        8: 412, 24: 411, 69: 410, 23: 409, 36: 409, 21: 409, 27: 408, 7: 408, 63: 407, 57: 406,
        28: 406, 80: 405, 22: 404, 32: 404, 41: 404, 2: 402, 35: 401, 17: 400, 30: 399, 20: 394,
        50: 394, 67: 392, 1: 390, 65: 389, 25: 388, 68: 388, 48: 386, 58: 386, 3: 375, 47: 374
    };
    const PONTUACAO_QUINA = {
        muitoFrequente: 2,
        mediaFrequente: 0.5,
        poucoFrequente: -1
    };
    let CATEGORIAS_FREQUENCIA_QUINA = {
        muitoFrequentes: [],
        mediaFrequentes: [],
        poucoFrequentes: []
    };

    // --- Função para salvar dados no localStorage ---
    function salvarDados() {
        localStorage.setItem(LOCAL_STORAGE_KEY_JOGOS, JSON.stringify(dadosJogos));
    }

    // --- Funções de Feedback Visual ---
    function exibirMensagem(texto, tipo = 'error', duracao = 4000) {
        mensagemFeedbackEl.textContent = texto;
        mensagemFeedbackEl.className = `message ${tipo}`;
        void mensagemFeedbackEl.offsetWidth; 
        mensagemFeedbackEl.classList.add('show');
        
        setTimeout(() => {
            mensagemFeedbackEl.classList.remove('show');
        }, duracao);
    }

    // --- Funções do Grid de Dezenas ---
    function renderizarGradeDezenas() {
        gradeDezenasDiv.innerHTML = '';
        for (let i = MIN_DEZENA; i <= MAX_DEZENA; i++) {
            const dezenaEl = document.createElement('div');
            dezenaEl.classList.add('number-cell');
            dezenaEl.textContent = i.toString().padStart(2, '0');
            dezenaEl.dataset.numero = i;
            dezenaEl.addEventListener('click', () => manipularCliqueDezena(i));
            gradeDezenasDiv.appendChild(dezenaEl);
        }
        atualizarVisualGrade();
    }

    function manipularCliqueDezena(numero) {
        const index = numerosSelecionados.indexOf(numero);
        if (index > -1) {
            numerosSelecionados.splice(index, 1);
        } else {
            if (numerosSelecionados.length < QTD_DEZENAS_ESCOLHER) {
                numerosSelecionados.push(numero);
            } else {
                exibirMensagem(`Você já selecionou ${QTD_DEZENAS_ESCOLHER} dezenas.`, 'error', 2000);
                return;
            }
        }
        numerosSelecionados.sort((a, b) => a - b);
        atualizarVisualGrade();
        renderizarNumerosSelecionados();
    }

    function atualizarVisualGrade() {
        const cells = gradeDezenasDiv.querySelectorAll('.number-cell');
        cells.forEach(cell => {
            const num = parseInt(cell.dataset.numero);
            cell.classList.remove('selected', 'disabled');
            if (numerosSelecionados.includes(num)) {
                cell.classList.add('selected');
            } else if (numerosSelecionados.length >= QTD_DEZENAS_ESCOLHER) {
                cell.classList.add('disabled');
            }
        });
    }

    function renderizarNumerosSelecionados() {
        dezenasSelecionadasDisplay.textContent = numerosSelecionados.length > 0 
            ? numerosSelecionados.map(n => n.toString().padStart(2, '0')).join(' - ')
            : 'Nenhuma';
        
        if (numerosSelecionados.length === QTD_DEZENAS_ESCOLHER) {
            analisarSelecaoComDadosFornecidos(numerosSelecionados);
        } else {
            analiseQuinaDisplayEl.style.display = 'none';
        }
    }

    // --- Funções de Lógica do Jogo ---
    btnGerarAleatorio.addEventListener('click', () => {
        numerosSelecionados = [];
        while (numerosSelecionados.length < QTD_DEZENAS_ESCOLHER) {
            const randomNum = Math.floor(Math.random() * MAX_DEZENA) + MIN_DEZENA;
            if (!numerosSelecionados.includes(randomNum)) {
                numerosSelecionados.push(randomNum);
            }
        }
        numerosSelecionados.sort((a, b) => a - b);
        atualizarVisualGrade();
        renderizarNumerosSelecionados();
        exibirMensagem('Dezenas aleatórias geradas!', 'success', 2000);
    });

    function limparFormulario() {
        nomeJogadorInput.value = '';
        numerosSelecionados = [];
        idEdicaoAtual = null;
        btnSalvarJogo.textContent = '💾 Salvar Jogo';
        atualizarVisualGrade();
        renderizarNumerosSelecionados();
        analiseQuinaDisplayEl.style.display = 'none';
        nomeJogadorInput.focus();
    }
    btnLimparEscolhas.addEventListener('click', () => {
        limparFormulario();
        exibirMensagem('Campos limpos.', 'success', 2000);
    });

    btnSalvarJogo.addEventListener('click', () => {
        const nome = nomeJogadorInput.value.trim();
        if (!nome) {
            exibirMensagem('O nome do jogador é obrigatório.', 'error');
            nomeJogadorInput.focus();
            return;
        }
        if (numerosSelecionados.length !== QTD_DEZENAS_ESCOLHER) {
            exibirMensagem(`Selecione exatamente ${QTD_DEZENAS_ESCOLHER} dezenas.`, 'error');
            return;
        }

        const resultadoConflito = verificarConflitoDezenas(numerosSelecionados, idEdicaoAtual);
        if (resultadoConflito.conflito) {
            const dezenasConflitoStr = resultadoConflito.dezenasConflito.map(d => d.toString().padStart(2, '0')).join(', ');
            exibirMensagem(`Conflito com jogo salvo! <span class="math-inline">\{resultadoConflito\.count\} dezenas \(</span>{dezenasConflitoStr}) são iguais às do jogo de ${resultadoConflito.nomeConflito}. Escolha outras dezenas.`, 'error', 5000);
            return;
        }
        
        if (idEdicaoAtual) {
            const jogoIndex = dadosJogos.findIndex(j => j.id === idEdicaoAtual);
            if (jogoIndex > -1) {
                dadosJogos[jogoIndex].nome = nome;
                dadosJogos[jogoIndex].dezenas = [...numerosSelecionados];
                dadosJogos[jogoIndex].timestamp = Date.now();
                exibirMensagem('Jogo atualizado com sucesso!', 'success');
            }
        } else {
            const novoJogo = {
                id: Date.now().toString(),
                nome: nome,
                dezenas: [...numerosSelecionados],
                timestamp: Date.now()
            };
            dadosJogos.push(novoJogo);
            exibirMensagem('Jogo salvo com sucesso!', 'success');
        }
        
        salvarDados(); // <<--- SALVA NO LOCALSTORAGE
        limparFormulario();
        atualizarTudo();
    });

    function verificarConflitoDezenas(novasDezenas, idJogoAtualParaExcluir = null) {
        for (const jogo of dadosJogos) {
            if (idJogoAtualParaExcluir && jogo.id === idJogoAtualParaExcluir) continue;
            
            const intersecao = novasDezenas.filter(dezena => jogo.dezenas.includes(dezena));
            if (intersecao.length >= MIN_CONFLICT_COUNT) {
                return { 
                    conflito: true, 
                    nomeConflito: jogo.nome, 
                    dezenasConflito: intersecao.sort((a,b)=>a-b),
                    count: intersecao.length
                };
            }
        }
        return { conflito: false };
    }

    // --- Funções do Histórico Otimizado ---
    inputBuscaJogador.addEventListener('input', (e) => {
        termoBuscaAtual = e.target.value.toLowerCase().trim();
        renderizarHistorico();
    });

    function renderizarHistorico() {
        historicoGridDiv.innerHTML = '';
        const jogosFiltrados = dadosJogos.filter(jogo => 
            jogo.nome.toLowerCase().includes(termoBuscaAtual)
        );

        if (jogosFiltrados.length === 0) {
            historicoGridDiv.innerHTML = `<p class="message info show" style="margin-top: 10px;">${dadosJogos.length === 0 ? 'Nenhum jogo salvo ainda.' : 'Nenhum jogo encontrado para "' + termoBuscaAtual + '".'}</p>`;
            return;
        }

        const jogosOrdenados = [...jogosFiltrados].sort((a, b) => b.timestamp - a.timestamp);

        jogosOrdenados.forEach(jogo => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('history-item-compact');
            itemDiv.dataset.id = jogo.id;

            const dezenasFormatadas = jogo.dezenas.map(d => d.toString().padStart(2, '0')).join(' - ');
            
            itemDiv.innerHTML = `
                <div class="info-jogador"><span class="math-inline">\{jogo\.nome\}</div\>
<div class\="info\-data"\></span>{new Date(jogo.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                <div class="dezenas-compactas">${dezenasFormatadas}</div>
                <div class="history-item-actions-compact">
                    <button class="btn btn-secondary btn-sm btn-editar" title="Editar Jogo">✏️ Editar</button>
                    <button class="btn btn-danger btn-sm btn-deletar" title="Deletar Jogo">🗑️ Deletar</button>
                </div>
            `;

            itemDiv.querySelector('.btn-editar').addEventListener('click', () => carregarParaEdicao(jogo.id));
            itemDiv.querySelector('.btn-deletar').addEventListener('click', () => deletarJogo(jogo.id, jogo.nome));
            historicoGridDiv.appendChild(itemDiv);
        });
    }
    
    function carregarParaEdicao(idJogo) {
        const jogoParaEditar = dadosJogos.find(j => j.id === idJogo);
        if (!jogoParaEditar) return;

        idEdicaoAtual = idJogo;
        nomeJogadorInput.value = jogoParaEditar.nome;
        numerosSelecionados = [...jogoParaEditar.dezenas];
        
        atualizarVisualGrade();
        renderizarNumerosSelecionados();
        
        btnSalvarJogo.textContent = '💾 Atualizar Jogo';
        exibirMensagem(`Editando jogo de ${jogoParaEditar.nome}. Faça as alterações e clique em "Atualizar Jogo".`, 'info', 5000);
        document.querySelector('.input-section h2').scrollIntoView({ behavior: 'smooth' });
        nomeJogadorInput.focus();
    }

    function deletarJogo(idJogo, nomeJogo) {
        if (confirm(`Tem certeza que deseja deletar o jogo de ${nomeJogo}?`)) {
            dadosJogos = dadosJogos.filter(j => j.id !== idJogo);
            if (idEdicaoAtual === idJogo) limparFormulario();
            
            salvarDados(); // <<--- SALVA NO LOCALSTORAGE
            exibirMensagem(`Jogo de ${nomeJogo} deletado.`, 'success');
            atualizarTudo();
        }
    }

    // --- Funções de Análise de Frequência (Quina - Dados Fornecidos) ---
    function calcularECategorizarFrequenciasQuina() {
        const todasAsFrequenciasValores = Object.values(FREQUENCIAS_QUINA_FORNECIDAS);
        if (todasAsFrequenciasValores.length === 0) return;

        todasAsFrequenciasValores.sort((a, b) => a - b); 

        const q1Index = Math.floor(todasAsFrequenciasValores.length / 4);
        const q3Index = Math.floor((3 * todasAsFrequenciasValores.length) / 4);
        
        const q1Value = todasAsFrequenciasValores[q1Index];
        const q3Value = todasAsFrequenciasValores[q3Index];

        CATEGORIAS_FREQUENCIA_QUINA.muitoFrequentes = [];
        CATEGORIAS_FREQUENCIA_QUINA.mediaFrequentes = [];
        CATEGORIAS_FREQUENCIA_QUINA.poucoFrequentes = [];

        for (const numeroStr in FREQUENCIAS_QUINA_FORNECIDAS) {
            const numero = parseInt(numeroStr);
            const freq = FREQUENCIAS_QUINA_FORNECIDAS[numeroStr];

            if (freq > q3Value || (q1Value === q3Value && freq === q3Value && todasAsFrequenciasValores.indexOf(freq) > q3Index && CATEGORIAS_FREQUENCIA_QUINA.muitoFrequentes.length < TOP_N_FREQUENCIA)) { 
                CATEGORIAS_FREQUENCIA_QUINA.muitoFrequentes.push(numero);
            } else if (freq < q1Value || (q1Value === q3Value && freq === q1Value && todasAsFrequenciasValores.indexOf(freq) < q1Index && CATEGORIAS_FREQUENCIA_QUINA.poucoFrequentes.length < TOP_N_FREQUENCIA)) {
                CATEGORIAS_FREQUENCIA_QUINA.poucoFrequentes.push(numero);
            } else {
                CATEGORIAS_FREQUENCIA_QUINA.mediaFrequentes.push(numero);
            }
        }
        
        if (CATEGORIAS_FREQUENCIA_QUINA.muitoFrequentes.length === 0 && Object.keys(FREQUENCIAS_QUINA_FORNECIDAS).length > 0) {
            const sortedByFreqDesc = Object.entries(FREQUENCIAS_QUINA_FORNECIDAS)
                .sort(([,a],[,b]) => b-a)
                .map(([num]) => parseInt(num));
            CATEGORIAS_FREQUENCIA_QUINA.muitoFrequentes = sortedByFreqDesc.slice(0, Math.min(TOP_N_FREQUENCIA, Math.floor(sortedByFreqDesc.length * 0.25) || 1) );
        }
         if (CATEGORIAS_FREQUENCIA_QUINA.poucoFrequentes.length === 0 && Object.keys(FREQUENCIAS_QUINA_FORNECIDAS).length > 0) {
            const sortedByFreqAsc = Object.entries(FREQUENCIAS_QUINA_FORNECIDAS)
                .sort(([,a],[,b]) => a-b)
                .map(([num]) => parseInt(num));
            CATEGORIAS_FREQUENCIA_QUINA.poucoFrequentes = sortedByFreqAsc.slice(0, Math.min(TOP_N_FREQUENCIA, Math.floor(sortedByFreqAsc.length * 0.25) || 1) );
        }
        
        const todosOsNumeros = Object.keys(FREQUENCIAS_QUINA_FORNECIDAS).map(n => parseInt(n));
        CATEGORIAS_FREQUENCIA_QUINA.mediaFrequentes = todosOsNumeros.filter(n => 
            !CATEGORIAS_FREQUENCIA_QUINA.muitoFrequentes.includes(n) &&
            !CATEGORIAS_FREQUENCIA_QUINA.poucoFrequentes.includes(n)
        );
    }

    function renderizarDashboardFrequenciaQuina() { 
        if (Object.keys(FREQUENCIAS_QUINA_FORNECIDAS).length === 0) { 
            dashboardAnaliseSectionPanels.style.display = 'none';
            mensagemDashboardVazioEl.textContent = 'Dados históricos da Quina não disponíveis para análise.';
            mensagemDashboardVazioEl.style.display = 'block';
            return;
        }
        
        dashboardAnaliseSectionPanels.style.display = 'flex';
        mensagemDashboardVazioEl.style.display = 'none';

        const maisFrequentesLista = [...CATEGORIAS_FREQUENCIA_QUINA.muitoFrequentes]
            .sort((a, b) => FREQUENCIAS_QUINA_FORNECIDAS[b] - FREQUENCIAS_QUINA_FORNECIDAS[a])
            .slice(0, TOP_N_FREQUENCIA);
        
        const menosFrequentesLista = [...CATEGORIAS_FREQUENCIA_QUINA.poucoFrequentes]
            .sort((a, b) => FREQUENCIAS_QUINA_FORNECIDAS[a] - FREQUENCIAS_QUINA_FORNECIDAS[b])
            .slice(0, TOP_N_FREQUENCIA);

        atualizarListaFrequenciaQuina(painelMaisFrequentesUl, maisFrequentesLista);
        atualizarListaFrequenciaQuina(painelMenosFrequentesUl, menosFrequentesLista);
    }

    function atualizarListaFrequenciaQuina(ulElement, dadosLista) { 
        ulElement.innerHTML = '';
        if (dadosLista.length === 0) {
            ulElement.innerHTML = '<li>Nenhum dado nesta categoria.</li>';
            return;
        }
        dadosLista.forEach(numero => {
            const contagem = FREQUENCIAS_QUINA_FORNECIDAS[numero];
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="numero"><span class="math-inline">\{numero\.toString\(\)\.padStart\(2, '0'\)\}</span\>
<span class\="contagem"\></span>{contagem} vez${contagem > 1 ? 'es' : ''}</span>
            `;
            ulElement.appendChild(li);
        });
    }

    function analisarSelecaoComDadosFornecidos(dezenasUsuario) {
        if (dezenasUsuario.length !== QTD_DEZENAS_ESCOLHER) {
            analiseQuinaDisplayEl.style.display = 'none';
            return;
        }

        let pontuacao = 0;
        let contMuitoFrequentes = 0;
        let contPoucoFrequentes = 0;
        let contMediaFrequentes = 0;

        dezenasUsuario.forEach(dezena => {
            if (CATEGORIAS_FREQUENCIA_QUINA.muitoFrequentes.includes(dezena)) {
                pontuacao += PONTUACAO_QUINA.muitoFrequente;
                contMuitoFrequentes++;
            } else if (CATEGORIAS_FREQUENCIA_QUINA.poucoFrequentes.includes(dezena)) {
                pontuacao += PONTUACAO_QUINA.poucoFrequente;
                contPoucoFrequentes++;
            } else { 
                pontuacao += PONTUACAO_QUINA.mediaFrequente;
                contMediaFrequentes++;
            }
        });

        const maxPontuacaoPossivel = QTD_DEZENAS_ESCOLHER * PONTUACAO_QUINA.muitoFrequente;
        const minPontuacaoPossivel = QTD_DEZENAS_ESCOLHER * PONTUACAO_QUINA.poucoFrequente;
        
        let percentual = 0;
        if (maxPontuacaoPossivel !== minPontuacaoPossivel) {
             percentual = ((pontuacao - minPontuacaoPossivel) / (maxPontuacaoPossivel - minPontuacaoPossivel)) * 100;
        } else if (pontuacao >= maxPontuacaoPossivel) {
            percentual = 100;
        } else {
            percentual = 0;
        }

        percentual = Math.max(0, Math.min(100, Math.round(percentual)));

        let notaQualitativa
