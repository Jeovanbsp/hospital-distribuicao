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
            p.peso += (p.grauAcamado === 'pouca') ? 4 : 3;
        }
        
        // --- Procedimentos Técnicos ---
        if (p.dispositivos) p.peso += 1; // SNE/GTM
        if (p.irrigacao) p.peso += 2;    // Irrigação (Peso de Semi)

        // --- Complexidade Extra (Comportamental/Familiar) ---
        if (p.grauExtra) {
            p.peso += parseInt(p.grauExtra); // Soma 1, 2 ou 3
        }
    });

    // 3. Separar Grupos
    const isolamentos = pacientes.filter(p => p.isolamento);
    const acamadosLimpos = pacientes.filter(p => !p.isolamento && p.mobilidade === 'acamado');
    const resto = pacientes.filter(p => !p.isolamento && p.mobilidade !== 'acamado');

    // Ordenar (Mais pesados primeiro)
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

    // --- FASE 1: Isolamentos ---
    isolamentos.forEach(pac => {
        let candidatos = tecnicos.filter(t => !t.temIsolamento && podeReceber(t, pac));
        if (candidatos.length === 0) candidatos = tecnicos.filter(t => podeReceber(t, pac));
        if (candidatos.length === 0) candidatos = tecnicos.filter(t => !(t.restricao && pac.mobilidade !== 'deambula'));

        if (candidatos.length > 0) {
            candidatos.sort((a, b) => a.carga - b.carga);
            const escolhido = candidatos[0];
            escolhido.pacientes.push(pac);
            escolhido.carga += pac.peso;
            escolhido.temIsolamento = true;
            if(pac.mobilidade === 'acamado') escolhido.qtdAcamados++;
        }
    });

    // --- FASE 2: Acamados (Prioridade: Quantidade > Enfermaria > Carga) ---
    acamadosLimpos.forEach(pac => {
        let candidatos = tecnicos.filter(t => podeReceber(t, pac));

        if (candidatos.length > 0) {
            candidatos.sort((a, b) => {
                if (a.qtdAcamados !== b.qtdAcamados) return a.qtdAcamados - b.qtdAcamados;
                
                if (evitarQuebraEnfermaria) {
                    const aTem = temColegaDeQuarto(a, pac);
                    const bTem = temColegaDeQuarto(b, pac);
                    if (aTem && !bTem) return -1; 
                    if (!aTem && bTem) return 1;  
                }
                return a.carga - b.carga;
            });
            
            const escolhido = candidatos[0];
            escolhido.pacientes.push(pac);
            escolhido.carga += pac.peso;
            escolhido.qtdAcamados++;
        } else {
            let fallback = tecnicos.filter(t => !(t.restricao && pac.mobilidade !== 'deambula'));
            if(fallback.length > 0) {
                fallback.sort((a, b) => a.qtdAcamados - b.qtdAcamados);
                fallback[0].pacientes.push(pac);
                fallback[0].carga += pac.peso;
                fallback[0].qtdAcamados++;
            }
        }
    });

    // --- FASE 3: O Resto (Prioridade: Carga > Enfermaria) ---
    resto.forEach(pac => {
        let candidatos = tecnicos.filter(t => podeReceber(t, pac));

        if (candidatos.length > 0) {
            candidatos.sort((a, b) => {
                let cargaA = a.carga;
                let cargaB = b.carga;

                if (evitarQuebraEnfermaria) {
                    if (temColegaDeQuarto(a, pac)) cargaA -= 2.5; 
                    if (temColegaDeQuarto(b, pac)) cargaB -= 2.5;
                }
                return cargaA - cargaB;
            });
            const escolhido = candidatos[0];
            escolhido.pacientes.push(pac);
            escolhido.carga += pac.peso;
        } else {
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