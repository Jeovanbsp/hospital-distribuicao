export function calcularDistribuicao(pacientes, tecnicos, evitarQuebraEnfermaria = false) {
    // 1. Resetar técnicos
    tecnicos.forEach(t => {
        t.pacientes = [];
        t.carga = 0;
        t.temIsolamento = false;
        t.qtdAcamados = 0;
    });

    // 2. Calcular pesos individuais
    pacientes.forEach(p => {
        p.peso = 0;
        
        // --- Mobilidade (Base) ---
        if (p.mobilidade === 'deambula') p.peso += 1;
        if (p.mobilidade === 'semi') p.peso += 2;
        if (p.mobilidade === 'acamado') {
            // Se tiver pouca mobilidade, pesa mais
            p.peso += (p.grauAcamado === 'pouca') ? 4 : 3;
        }
        
        // --- Procedimentos Técnicos ---
        if (p.dispositivos) p.peso += 1; // SNE/GTM
        if (p.irrigacao) p.peso += 2;    // Irrigação

        // --- Complexidade Extra ---
        if (p.grauExtra) {
            p.peso += parseInt(p.grauExtra);
        }
    });

    // 3. Separar Grupos
    const isolamentos = pacientes.filter(p => p.isolamento);
    const acamadosLimpos = pacientes.filter(p => !p.isolamento && p.mobilidade === 'acamado');
    const resto = pacientes.filter(p => !p.isolamento && p.mobilidade !== 'acamado');

    // Ordenar (Mais pesados primeiro para garantir distribuição justa dos difíceis)
    acamadosLimpos.sort((a, b) => b.peso - a.peso);
    resto.sort((a, b) => b.peso - a.peso);

    // --- HELPER: Identifica a Enfermaria ---
    const getEnfermaria = (leito) => {
        if (!leito) return '';
        return leito.includes('-') ? leito.split('-')[0] : leito;
    };

    const temColegaDeQuarto = (tec, pac) => {
        const enfPac = getEnfermaria(pac.leito);
        return tec.pacientes.some(p => getEnfermaria(p.leito) === enfPac);
    };

    // --- FUNÇÃO AUXILIAR: Pode Receber? ---
    const podeReceber = (tec, pac) => {
        if (tec.restricao && pac.mobilidade !== 'deambula') return false;
        if (pac.evitarTecnicoId && pac.evitarTecnicoId === tec.id) return false;

        // Regra Nomes Iguais
        if (pac.nome && pac.nome.trim() !== '') {
            const nomeNovo = pac.nome.trim().split(' ')[0].toLowerCase();
            const temNomeIgual = tec.pacientes.some(p => {
                if (!p.nome || p.nome.trim() === '') return false;
                const nomeExistente = p.nome.trim().split(' ')[0].toLowerCase();
                return nomeExistente === nomeNovo;
            });
            if (temNomeIgual) return false;
        }
        return true;
    };

    // --- FASE 1: Isolamentos (Prioridade Sanitária) ---
    isolamentos.forEach(pac => {
        let candidatos = tecnicos.filter(t => !t.temIsolamento && podeReceber(t, pac));
        if (candidatos.length === 0) candidatos = tecnicos.filter(t => podeReceber(t, pac));
        if (candidatos.length === 0) candidatos = tecnicos.filter(t => !(t.restricao && pac.mobilidade !== 'deambula'));

        if (candidatos.length > 0) {
            // Aqui mantemos menor carga para isolamento não cair sempre no mesmo se todos tiverem 0 pacientes
            candidatos.sort((a, b) => a.pacientes.length - b.pacientes.length || a.carga - b.carga);
            const escolhido = candidatos[0];
            escolhido.pacientes.push(pac);
            escolhido.carga += pac.peso;
            escolhido.temIsolamento = true;
            if(pac.mobilidade === 'acamado') escolhido.qtdAcamados++;
        }
    });

    // --- FASE 2: Acamados (Prioridade: Quantidade de Pesados) ---
    // Distribui os pesados igualmente "por cabeça"
    acamadosLimpos.forEach(pac => {
        let candidatos = tecnicos.filter(t => podeReceber(t, pac));

        if (candidatos.length > 0) {
            candidatos.sort((a, b) => {
                // 1. Quem tem MENOS acamados recebe primeiro
                if (a.qtdAcamados !== b.qtdAcamados) return a.qtdAcamados - b.qtdAcamados;
                // 2. Quem tem MENOS pacientes no total
                if (a.pacientes.length !== b.pacientes.length) return a.pacientes.length - b.pacientes.length;
                // 3. Desempate por carga
                return a.carga - b.carga;
            });
            
            const escolhido = candidatos[0];
            escolhido.pacientes.push(pac);
            escolhido.carga += pac.peso;
            escolhido.qtdAcamados++;
        } else {
            // Fallback
            let fallback = tecnicos.filter(t => !(t.restricao && pac.mobilidade !== 'deambula'));
            if(fallback.length > 0) {
                fallback.sort((a, b) => a.qtdAcamados - b.qtdAcamados);
                fallback[0].pacientes.push(pac);
                fallback[0].carga += pac.peso;
                fallback[0].qtdAcamados++;
            }
        }
    });

    // --- FASE 3: O Resto (Prioridade: IGUALDADE NUMÉRICA) ---
    // Aqui mudou: Agora o foco é encher quem tem menos pacientes
    resto.forEach(pac => {
        let candidatos = tecnicos.filter(t => podeReceber(t, pac));

        if (candidatos.length > 0) {
            candidatos.sort((a, b) => {
                // 1. CRITÉRIO SUPREMO: Número de pacientes
                // Se A tem 3 pacientes e B tem 4, A ganha o paciente, independente do peso.
                if (a.pacientes.length !== b.pacientes.length) {
                    return a.pacientes.length - b.pacientes.length;
                }

                // 2. Critério Secundário: Manter Enfermaria (se ativado)
                // Só entra aqui se a quantidade de pacientes for IGUAL
                if (evitarQuebraEnfermaria) {
                    const aTem = temColegaDeQuarto(a, pac);
                    const bTem = temColegaDeQuarto(b, pac);
                    if (aTem && !bTem) return -1; 
                    if (!aTem && bTem) return 1;  
                }

                // 3. Critério Terciário: Carga (Peso)
                // Só usa o peso para desempatar se quantidade for igual
                return a.carga - b.carga;
            });
            
            const escolhido = candidatos[0];
            escolhido.pacientes.push(pac);
            escolhido.carga += pac.peso;
        } else {
            // Fallback
            let fallback = tecnicos.filter(t => !(t.restricao && pac.mobilidade !== 'deambula'));
            if(fallback.length > 0) {
                fallback.sort((a, b) => a.pacientes.length - b.pacientes.length);
                fallback[0].pacientes.push(pac);
                fallback[0].carga += pac.peso;
            }
        }
    });

    return tecnicos;
}