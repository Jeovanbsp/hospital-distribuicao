# 🏥 S.D.P. Hospitalar - Sistema de Distribuição de Plantão

O **S.D.P. (Sistema de Distribuição de Plantão)** é uma aplicação web desenvolvida para automatizar, otimizar e equilibrar a distribuição de pacientes entre a equipe de técnicos de enfermagem em um ambiente hospitalar. 

O sistema utiliza um algoritmo de pontuação (pesos) e critérios de prioridade para garantir que a carga de trabalho seja justa, evitando a sobrecarga de profissionais e melhorando a qualidade da assistência.

---

## ✨ Funcionalidades Principais

* **⚖️ Distribuição Igualitária:** O algoritmo prioriza que todos os técnicos terminem com o **mesmo número de pacientes**.
* **🧮 Sistema de Pesos:** Pacientes recebem pontuações baseadas em sua mobilidade e uso de dispositivos (SNE, Drenos, Irrigação, etc).
* **🛏️ Manter Enfermaria & Vizinhança:** O sistema tenta agrupar pacientes do mesmo quarto ou de leitos próximos para o mesmo técnico, reduzindo o tempo de deslocamento no corredor.
* **⚠️ Regras Sanitárias:** Isolamentos são distribuídos separadamente para evitar que um único técnico assuma múltiplos isolamentos de contato/aerossol.
* **🚫 Restrições da Equipe:** É possível marcar técnicos com restrição laboral (ex: dores lombares, gestantes), impedindo que recebam pacientes acamados.
* **📋 Fila de Admissão:** Calcula automaticamente qual técnico deve receber a próxima internação do plantão (baseado na menor quantidade de pacientes e menor carga atual).
* **🖨️ Relatório de Impressão:** Geração de relatório limpo e formatado para impressão, com campos para assinatura dos técnicos e identificação do enfermeiro responsável.
* **🌙 Dark Mode:** Interface com Modo Escuro integrado para plantões noturnos, reduzindo o cansaço visual.

---

## 🧠 Como funciona a Lógica do Algoritmo?

O sistema calcula a "Carga de Trabalho" (Peso) de cada paciente seguindo os critérios abaixo:

### Mobilidade Base
* **Leve (Deambula):** 1 Ponto
* **Médio (Semi):** 2 Pontos
* **Pesado (Acamado c/ Boa Mobilidade):** 3 Pontos
* **Pesado (Acamado c/ Pouca Mobilidade):** 4 Pontos

### Adicionais / Procedimentos
* **Usa SNE / GTM:** +1 Ponto
* **Dreno:** +1 Ponto
* **Selo D'água:** +1 Ponto
* **Irrigação (Vesical Contínua):** +2 Pontos
* **Grau Extra (Familiar/Comportamental):** +1 a +3 Pontos

### Pilares de Distribuição
A distribuição ocorre em fases, garantindo que "os piores cenários" sejam divididos por igual:
1. **Isolamentos** distribuídos primeiro.
2. **Pacientes Acamados** divididos por igual (se há 4 acamados e 4 técnicos, cada um recebe 1).
3. **Pacientes com Irrigação** e **SNE/Dietas** divididos por igual.
4. **Igualdade Numérica:** As vagas restantes são preenchidas visando manter o número de pacientes (cabeças) igual para todos, utilizando a carga (peso) apenas como critério de desempate.

---

## 🚀 Tecnologias Utilizadas

* **[Vue.js 3](https://vuejs.org/)** (Composition API & `<script setup>`)
* **[Vite](https://vitejs.dev/)** (Build Tool)
* **[Tailwind CSS](https://tailwindcss.com/)** (Estilização e Responsividade)
* **[FontAwesome](https://fontawesome.com/)** (Ícones)

---

## 📦 Como rodar o projeto localmente

### Pré-requisitos
Você precisará do [Node.js](https://nodejs.org/) instalado na sua máquina.

### Passos de Instalação

1. Clone este repositório:
```bash
git clone [https://github.com/SEU_USUARIO/hospital-distribuicao.git](https://github.com/SEU_USUARIO/hospital-distribuicao.git)
