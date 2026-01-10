export function calcularDistribuicao(pacientes, tecnicos) {
    // 1. Resetar técnicos para começar limpo
    tecnicos.forEach(t => {
        t.pacientes = [];
        t.carga = 0;
        t.temIsolamento = false;
    });

    // 2. Calcular pesos individuais dos pacientes
    pacientes.forEach(p => {
        p.peso = 0;
        // Regra de Mobilidade
        if (p.mobilidade === 'deambula') p.peso += 1;
        if (p.mobilidade === 'semi') p.peso += 2;
        if (p.mobilidade === 'acamado') p.peso += 3;
        
        // Regra de Dispositivos (SNE/GTM)
        if (p.dispositivos) p.peso += 1;
    });

    // 3. Separar grupos críticos
    const isolamentos = pacientes.filter(p => p.isolamento);
    const normais = pacientes.filter(p => !p.isolamento);

    // Ordenar normais do mais pesado para o mais leve (Estratégia Greedy)
    normais.sort((a, b) => b.peso - a.peso);

    // --- FUNÇÃO AUXILIAR: Verifica se técnico pode receber o paciente ---
    const podeReceber = (tec, pac) => {
        // Regra 1: Restrição Física (Técnico com restrição só pega Deambula/Grau 0)
        if (tec.restricao && pac.mobilidade !== 'deambula') return false;

        // Regra 2: Evitar técnico do plantão anterior
        if (pac.evitarTecnicoId && pac.evitarTecnicoId === tec.id) return false;

        // Regra 3: Nomes Iguais (Segurança do Paciente)
        // Pega o primeiro nome (Ex: "João" de "João Silva")
        const nomeNovo = pac.nome.trim().split(' ')[0].toLowerCase();
        
        // Verifica se o técnico já tem alguém com esse primeiro nome
        const temNomeIgual = tec.pacientes.some(p => {
            const nomeExistente = p.nome.trim().split(' ')[0].toLowerCase();
            return nomeExistente === nomeNovo;
        });

        if (temNomeIgual) return false;

        return true;
    };

    // --- FASE 1: Distribuição de Isolamentos ---
    // Tentamos dar 1 isolamento por técnico
    isolamentos.forEach(pac => {
        // Tenta achar técnico SEM isolamento e QUE POSSA receber
        let candidatos = tecnicos.filter(t => !t.temIsolamento && podeReceber(t, pac));
        
        // Se todos já têm isolamento, libera para quem puder receber
        if (candidatos.length === 0) {
            candidatos = tecnicos.filter(t => podeReceber(t, pac));
        }

        // Se ainda não achou (ex: restrição severa de nome/plantão), tenta forçar em qualquer um 
        // desde que não quebre a restrição física médica
        if (candidatos.length === 0) {
            candidatos = tecnicos.filter(t => !(t.restricao && pac.mobilidade !== 'deambula'));
        }

        if (candidatos.length > 0) {
            // Pega o com menor carga atual
            candidatos.sort((a, b) => a.carga - b.carga);
            const escolhido = candidatos[0];
            escolhido.pacientes.push(pac);
            escolhido.carga += pac.peso;
            escolhido.temIsolamento = true;
        }
    });

    // --- FASE 2: Pacientes Normais ---
    normais.forEach(pac => {
        // Filtra quem pode receber respeitando todas as regras
        let candidatos = tecnicos.filter(t => podeReceber(t, pac));

        if (candidatos.length > 0) {
            // Critério de Desempate:
            // 1. Quem tem MENOS PESO (Carga)
            // 2. Quem tem MENOS PACIENTES (Quantidade)
            candidatos.sort((a, b) => {
                if (a.carga !== b.carga) return a.carga - b.carga;
                return a.pacientes.length - b.pacientes.length;
            });
            
            const escolhido = candidatos[0];
            escolhido.pacientes.push(pac);
            escolhido.carga += pac.peso;
        } else {
            // Fallback: Se ninguém atende os critérios perfeitos (nomes/evitar), 
            // pega o de menor carga que não tenha restrição física impeditiva
            let fallback = tecnicos.filter(t => !(t.restricao && pac.mobilidade !== 'deambula'));
            
            if(fallback.length > 0) {
                fallback.sort((a, b) => a.carga - b.carga);
                fallback[0].pacientes.push(pac);
                fallback[0].carga += pac.peso;
            }
        }
    });

    return tecnicos;
}