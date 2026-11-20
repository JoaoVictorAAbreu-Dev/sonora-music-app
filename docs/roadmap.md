# Roadmap

Six one-week sprints (~10 h each, tasks of 1–3 h) after M1/M2, tracked as GitHub issues with one milestone per sprint.
Task IDs: `S<sprint>-<nn>`; `BL-<nn>` is the backlog. Items blocked on the project owner carry the `blocked:owner` label.

Board: https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/milestones

## Sprint 1 · Catálogo na API (M3a)

- [ ] [#1](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/1) [S1-01] Shared: Definir contratos de catálogo (faixa, álbum, artista, busca e Início)
- [ ] [#2](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/2) [S1-02] API: Implementar cliente Jamendo com timeout e mapeamento
- [ ] [#3](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/3) [S1-03] API: Implementar cache read-through do catálogo
- [ ] [#4](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/4) [S1-04] API: Expor endpoints de catálogo (busca, faixa, álbum, artista e Início)
- [ ] [#5](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/5) [S1-05] API: Testar integração com Jamendo mockado
- [ ] [#6](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/6) [S1-06] Docs: Documentar configuração do catálogo (env e Compose)

## Sprint 2 · Início e Busca (M3b)

- [ ] [#7](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/7) [S2-01] App: Configurar TanStack Query e hooks de catálogo
- [ ] [#8](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/8) [S2-02] App: Criar componentes de catálogo (card, linha de faixa, chip e esqueleto)
- [ ] [#9](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/9) [S2-03] App: Implementar tela Início (T05)
- [ ] [#10](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/10) [S2-04] App: Implementar tela Buscar (T06) com todos os estados
- [ ] [#11](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/11) [S2-05] App: Testar telas Início e Buscar

## Sprint 3 · Player (M4a)

- [ ] [#12](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/12) [S3-01] App: Integrar react-native-track-player e serviço de reprodução
- [ ] [#13](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/13) [S3-02] App: Implementar estado do player (fila, navegação, shuffle e repeat)
- [ ] [#14](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/14) [S3-03] App: Implementar mini player (T11) com vidro e fallback sólido
- [ ] [#15](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/15) [S3-04] App: Implementar player expandido (T12)
- [ ] [#16](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/16) [S3-05] App: Testar estado do player

## Sprint 4 · Fila, segundo plano e histórico (M4b)

- [ ] [#17](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/17) [S4-01] App: Habilitar reprodução em segundo plano e controles na tela de bloqueio
- [ ] [#18](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/18) [S4-02] App: Implementar fila (T13) com reordenação e remoção
- [ ] [#19](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/19) [S4-03] App: Animar troca de capa entre faixas
- [ ] [#20](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/20) [S4-04] API/App: Registrar histórico de reprodução
- [ ] [#21](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/21) [S4-05] QA: Testar player e atualizar checklist de dispositivo

## Sprint 5 · Biblioteca (M5)

- [ ] [#22](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/22) [S5-01] API: Implementar favoritos
- [ ] [#23](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/23) [S5-02] API: Implementar playlists e gestão de faixas
- [ ] [#24](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/24) [S5-03] App: Implementar Biblioteca (T07) e Favoritos (T14)
- [ ] [#25](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/25) [S5-04] App: Implementar fluxos de playlist (T10, T15 e T16)
- [ ] [#26](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/26) [S5-05] App: Confirmar exclusão de playlist (T20) com toast

## Sprint 6 · Qualidade e release (M7/M8)

- [ ] [#27](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/27) [S6-01] API/App: Implementar exclusão de conta e Configurações (T18)
- [ ] [#28](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/28) [S6-02] App: Implementar estado offline (T21) e estados de erro e vazio
- [ ] [#29](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/29) [S6-03] QA: Auditar acessibilidade e movimento reduzido
- [ ] [#30](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/30) [S6-04] Infra: Publicar política de privacidade e monitorar /health
- [ ] [#31](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/31) [S6-05] Infra: Preparar workflow de deploy e perfis EAS

## Backlog

- [ ] [#32](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/32) [BL-01] Auth: Login social com Google e Apple (M6)
- [ ] [#33](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/33) [BL-02] Auth: Recuperação de senha (T04)
- [ ] [#34](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/34) [BL-03] App: Telas Artista, Álbum, Perfil e Sobre (T08, T09, T17 e T19)
- [ ] [#35](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/35) [BL-04] Infra: Deploy em produção, backup e teste de restore no GCP
- [ ] [#36](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/36) [BL-05] QA: Executar fluxo Maestro e checklist em dispositivo real
- [ ] [#37](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/37) [BL-06] Docs: Incluir docs 04/05 e validar licença do Jamendo
