# Caso de portfólio

## Problema

Uma cafeteria com movimento elevado precisa acompanhar insumos, validade, receitas, perdas e reposição. O café coado é o item de maior saída informado pelo solicitante, e deve ser controlado em duas etapas: consumo de grãos no preparo e consumo da bebida pronta na venda.

## Decisões

PVPS para consumir o lote de menor validade, ficha técnica confirmada antes da venda, reposição calculada a partir de consumo e prazo, papéis separados para equipe e snapshots para recuperação. Saldos versionados e auditoria em tabela separada permitem impedir sobrescritas e conservar o histórico.

Cada envio recebe uma chave única. Repetir o mesmo envio após uma falha de rede devolve o resultado sem aplicar outra venda. O estorno conserva a venda original e devolve os insumos aos lotes correspondentes.

## Evidências

21 testes de domínio, validação, acesso e CSV. Um roteiro de integração HTTP local verifica gravação, autenticação, concorrência de duas vendas, reenvio idempotente, estorno e restauração. Build e checagem de tipos foram executados. O workflow de CI está versionado; seu resultado remoto deve ser consultado no GitHub.

A imagem do README usa exclusivamente dados fictícios. Não há comprovação de redução de perdas, melhoria de faturamento, capacidade de carga ou adoção diária pela loja.

## Texto para currículo

**Stereo Café — sistema de estoque para cafeteria:** aplicação web com React e TypeScript, API em Cloudflare Workers e D1/SQLite. Controle de lotes e validade, receitas, preparo de coado, reposição, auditoria, acesso por perfil, estorno e backups. Testes de regras de negócio, permissões e integração HTTP; pipeline de CI no GitHub.

O desenvolvimento foi assistido por IA. Para entrevistas, explique as decisões, execute os testes e demonstre os casos de erro; não apresente impacto operacional ou contratação que não tenham sido confirmados.
