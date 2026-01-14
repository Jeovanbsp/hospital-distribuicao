export function calcularDistribuicao(pacientes, tecnicos, evitarQuebraEnfermaria = false, manterProximidade = false) {
    // 1. Resetar técnicos e contadores
    tecnicos.forEach(t => {
        t.pacientes = [];
        t.carga = 0;
        t.temIsolamento = false;
        t.qtdAcamados = 0;
        t.qtdDietas = 0;
        t.qtdIrrigacoes = 0;
    });

    // 2. Calcular pesos individuais
    pacientes.forEach(p => {
        p.peso = 0;
        // Mobilidade
        if (p.mobilidade === 'deambula') p.peso += 1;
        if (p.mobilidade === 'semi') p.peso += 2;
        if (p.mobilidade === 'acamado') p.peso += (p.grauAcamado === 'pouca') ? 4 : 3;
        
        // Procedimentos
        if (p.dispositivos) p.peso += 1; // SNE/GTM
        if (p.dreno) p.peso += 1;        // DRENO (+1)
        if (p.selo) p.peso += 1;         // SELO (+1) <--- NOVO SEPARADO
        if (p.irrigacao) p.peso += 2;    // Irrigação (+2)
        
        // Extra
        if (p.grauExtra) p.peso += parseInt(p.grauExtra);
    });

    // 3. Separar Grupos
    const isolamentos = pacientes.filter(p => p.isolamento);
    const acamadosLimpos = pacientes.filter(p => !p.isolamento && p.mobilidade === 'acamado');
    const irrigacoesLimpas = pacientes.filter(p => !p.isolamento && p.mobilidade !== 'acamado' && p.irrigacao);
    const dietasLimpas = pacientes.filter(p => !p.isolamento && p.mobilidade !== 'acamado' && !p.irrigacao && p.dispositivos);
    // Drenos e Selos entram no "Resto" (ou dieta se tiverem dieta), sendo distribuídos por carga/qtd
    const resto = pacientes.filter(p => !p.isolamento && p.mobilidade !== 'acamado' && !p.irrigacao && !p.dispositivos);

    // Ordenar (Mais pesados primeiro)
    const sortPeso = (a, b) => b.peso - a.peso;
    isolamentos.sort(sortPeso);
    acamadosLimpos.sort(sortPeso);
    irrigacoesLimpas.sort(sortPeso);
    dietasLimpas.sort(sortPeso);
    resto.sort(sortPeso);

    // --- HELPERS ---
    const getNumeroLeito = (leito) => {
        if (!leito) return 9999;
        const num = leito.split('-')[0];
        return parseInt(num.replace(/\D/g, '')) || 9999;
    };

    const getEnfermaria = (leito) => leito ? (leito.includes('-') ? leito.split('-')[0] : leito) : '';

    const temColegaDeQuarto = (tec, pac) => {
        const enfPac = getEnfermaria(pac.leito);
        return tec.pacientes.some(p => getEnfermaria(p.leito) === enfPac);
    };

    const getDistanciaMinima = (tec, pac) => {
        if (tec.pacientes.length === 0) return 0;
        const numPac = getNumeroLeito(pac.leito);
        const distancias = tec.pacientes.map(p => Math.abs(numPac - getNumeroLeito(p.leito)));
        return Math.min(...distancias);
    };

    const podeReceber = (tec, pac) => {
        if (tec.restricao && pac.mobilidade !== 'deambula') return false;
        if (pac.evitarTecnicoId && pac.evitarTecnicoId === tec.id) return false;
        if (pac.nome && pac.nome.trim() !== '') {
            const nomeNovo = pac.nome.trim().split(' ')[0].toLowerCase();
            const temNomeIgual = tec.pacientes.some(p => {
                if (!p.nome) return false;
                return p.nome.trim().split(' ')[0].toLowerCase() === nomeNovo;
            });
            if (temNomeIgual) return false;
        }
        return true;
    };

    const atribuir = (tec, pac) => {
        tec.pacientes.push(pac);
        tec.carga += pac.peso;
        if (pac.isolamento) tec.temIsolamento = true;
        if (pac.mobilidade === 'acamado') tec.qtdAcamados++;
        if (pac.dispositivos) tec.qtdDietas++;
        if (pac.irrigacao) tec.qtdIrrigacoes++;
    };

    // --- FASE 1: Isolamentos ---
    isolamentos.forEach(pac => {
        let candidatos = tecnicos.filter(t => !t.temIsolamento && podeReceber(t, pac));
        if (candidatos.length === 0) candidatos = tecnicos.filter(t => podeReceber(t, pac));
        if (candidatos.length === 0) candidatos = tecnicos.filter(t => !(t.restricao && pac.mobilidade !== 'deambula'));

        if (candidatos.length > 0) {
            candidatos.sort((a, b) => a.pacientes.length - b.pacientes.length || a.carga - b.carga);
            atribuir(candidatos[0], pac);
        }
    });

    // --- FASE 2: Acamados ---
    acamadosLimpos.forEach(pac => {
        let candidatos = tecnicos.filter(t => podeReceber(t, pac));
        if (candidatos.length > 0) {
            candidatos.sort((a, b) => {
                if (a.qtdAcamados !== b.qtdAcamados) return a.qtdAcamados - b.qtdAcamados;
                if (pac.irrigacao && a.qtdIrrigacoes !== b.qtdIrrigacoes) return a.qtdIrrigacoes - b.qtdIrrigacoes;
                
                if (evitarQuebraEnfermaria) {
                    const aTem = temColegaDeQuarto(a, pac);
                    const bTem = temColegaDeQuarto(b, pac);
                    const diferencaQtd = a.pacientes.length - b.pacientes.length;
                    if (aTem && !bTem && diferencaQtd <= 1) return -1;
                    if (!aTem && bTem && diferencaQtd >= -1) return 1;
                }

                if (a.pacientes.length !== b.pacientes.length) return a.pacientes.length - b.pacientes.length;
                if (manterProximidade) {
                    const distA = getDistanciaMinima(a, pac); const distB = getDistanciaMinima(b, pac);
                    if (distA !== distB) return distA - distB;
                }
                return a.carga - b.carga;
            });
            atribuir(candidatos[0], pac);
        } else {
            let fallback = tecnicos.filter(t => !(t.restricao && pac.mobilidade !== 'deambula'));
            if(fallback.length > 0) {
                fallback.sort((a, b) => a.qtdAcamados - b.qtdAcamados);
                atribuir(fallback[0], pac);
            }
        }
    });

    // --- FASE 3: Irrigações ---
    irrigacoesLimpas.forEach(pac => {
        let candidatos = tecnicos.filter(t => podeReceber(t, pac));
        if (candidatos.length > 0) {
            candidatos.sort((a, b) => {
                if (a.qtdIrrigacoes !== b.qtdIrrigacoes) return a.qtdIrrigacoes - b.qtdIrrigacoes;
                if (a.pacientes.length !== b.pacientes.length) return a.pacientes.length - b.pacientes.length;
                if (evitarQuebraEnfermaria) {
                    const aTem = temColegaDeQuarto(a, pac); const bTem = temColegaDeQuarto(b, pac);
                    if (aTem && !bTem && (a.pacientes.length - b.pacientes.length <= 1)) return -1;
                    if (!aTem && bTem && (b.pacientes.length - a.pacientes.length <= 1)) return 1;
                }
                if (manterProximidade) {
                    const distA = getDistanciaMinima(a, pac); const distB = getDistanciaMinima(b, pac);
                    if (distA !== distB) return distA - distB;
                }
                return a.carga - b.carga;
            });
            atribuir(candidatos[0], pac);
        } else {
            let fallback = tecnicos.filter(t => !(t.restricao && pac.mobilidade !== 'deambula'));
            if(fallback.length > 0) {
                fallback.sort((a, b) => a.qtdIrrigacoes - b.qtdIrrigacoes);
                atribuir(fallback[0], pac);
            }
        }
    });

    // --- FASE 4: Dietas ---
    dietasLimpas.forEach(pac => {
        let candidatos = tecnicos.filter(t => podeReceber(t, pac));
        if (candidatos.length > 0) {
            candidatos.sort((a, b) => {
                if (a.qtdDietas !== b.qtdDietas) return a.qtdDietas - b.qtdDietas;
                if (a.pacientes.length !== b.pacientes.length) return a.pacientes.length - b.pacientes.length;
                if (evitarQuebraEnfermaria) {
                    const aTem = temColegaDeQuarto(a, pac); const bTem = temColegaDeQuarto(b, pac);
                    if (aTem && !bTem && (a.pacientes.length - b.pacientes.length <= 1)) return -1;
                    if (!aTem && bTem && (b.pacientes.length - a.pacientes.length <= 1)) return 1;
                }
                if (manterProximidade) {
                    const distA = getDistanciaMinima(a, pac); const distB = getDistanciaMinima(b, pac);
                    if (distA !== distB) return distA - distB;
                }
                return a.carga - b.carga;
            });
            atribuir(candidatos[0], pac);
        } else {
            let fallback = tecnicos.filter(t => !(t.restricao && pac.mobilidade !== 'deambula'));
            if(fallback.length > 0) {
                fallback.sort((a, b) => a.qtdDietas - b.qtdDietas);
                atribuir(fallback[0], pac);
            }
        }
    });

    // --- FASE 5: O Resto ---
    resto.forEach(pac => {
        let candidatos = tecnicos.filter(t => podeReceber(t, pac));
        if (candidatos.length > 0) {
            candidatos.sort((a, b) => {
                if (evitarQuebraEnfermaria) {
                    const aTem = temColegaDeQuarto(a, pac); const bTem = temColegaDeQuarto(b, pac);
                    const diferencaQtd = a.pacientes.length - b.pacientes.length;
                    if (aTem && !bTem && diferencaQtd <= 1) return -1;
                    if (!aTem && bTem && diferencaQtd >= -1) return 1;
                }
                if (a.pacientes.length !== b.pacientes.length) return a.pacientes.length - b.pacientes.length;
                if (manterProximidade) {
                    const distA = getDistanciaMinima(a, pac); const distB = getDistanciaMinima(b, pac);
                    if (distA !== distB) return distA - distB;
                }
                return a.carga - b.carga;
            });
            atribuir(candidatos[0], pac);
        } else {
            let fallback = tecnicos.filter(t => !(t.restricao && pac.mobilidade !== 'deambula'));
            if(fallback.length > 0) {
                fallback.sort((a, b) => a.pacientes.length - b.pacientes.length);
                atribuir(fallback[0], pac);
            }
        }
    });

    return tecnicos;
}