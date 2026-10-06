# Manual da loja

## Antes da primeira venda

1. O proprietário acessa sua conta e verifica seu perfil de gerente.
2. Em **Equipe & backups**, cadastra nome, e-mail e papel de cada funcionário. O mesmo e-mail precisa ser autorizado no compartilhamento privado da hospedagem.
3. Registra o estoque real por lote. As unidades base são g, ml e un; 1 kg = 1.000 g e 1 L = 1.000 ml. Converta o custo para a mesma unidade.
4. Ajusta custos estimados, consumo diário, prazo de entrega, segurança e estoque alvo.
5. Confirma cada ficha técnica. Sabores e opções sazonais podem ser cadastrados com receitas próprias. As sugestões não devem ser confirmadas sem conferir as porções reais.
6. Realiza uma venda de teste, seu estorno e uma exportação/restauração em ambiente de teste antes da aceitação operacional.

## Perfis

| Operação                                         | Atendente | Gerente |
| ------------------------------------------------ | --------- | ------- |
| Consultar saldos                                 | Sim       | Sim     |
| Vender, preparar coado, registrar perda e rotina | Sim       | Sim     |
| Receber mercadoria e planejar compras            | Não       | Sim     |
| Alterar insumos, receitas e produtos             | Não       | Sim     |
| Registrar contagem e estornar venda              | Não       | Sim     |
| Administrar funcionários e recuperar backup      | Não       | Sim     |

O responsável é obtido da conta autenticada; não é digitado no formulário. Funcionário inativo não acessa os dados, mesmo que continue autorizado no gateway. O administrador inicial é definido pela hospedagem para evitar que a loja fique sem responsável.

## Café coado

Registre o rendimento em litros, gramas de café, filtros e limite de uso da batelada. A sugestão inicial é 60 g/L e 60 minutos, a confirmar pela loja. O estoque de grãos sai no preparo, e o estoque de coado pronto sai na venda. Assim não há dupla baixa.

O limite começa no instante do preparo. Ao vencê-lo, o lote continua visível para descarte/conferência, mas não pode ser vendido. Registre as sobras como perda. Os procedimentos de tempo, temperatura e conservação da cafeteria continuam sendo responsabilidade da equipe.

Na venda de uma bebida com leite integral, marcar **leite vegetal** substitui esse insumo pelo vegetal na mesma quantidade e acrescenta R$ 4 por produto. Confira a receita de cada tamanho.

## Rotina

- **Abertura:** conferir grãos, filtros, leite, validade e armazenamento; registrar recebimentos.
- **Pico:** acompanhar o coado disponível e preparar bateladas conforme demanda.
- **Fechamento:** contar lotes críticos, lançar perdas e sobras e conferir entregas do próximo dia.

O ponto de pedido usa consumo diário previsto × prazo de entrega + reserva. A compra sugerida desconta os pedidos pendentes. O pedido não é enviado ao fornecedor pelo programa.

## Corrigir erros

Vendas recentes com rastreabilidade podem ser estornadas por gerente em **Relatórios**. Os insumos voltam aos mesmos lotes; se o lote estiver vencido, a quantidade continua bloqueada para venda. O estorno é um novo registro e não apaga a venda.

Perdas e diferenças de contagem exigem justificativa. Se uma entrada tiver quantidade incorreta, faça a contagem do lote e documente o ajuste. Corrija cadastros futuros sem tentar apagar auditoria.

Se aparecer mensagem de estoque atualizado por outra pessoa, o registro não foi aplicado. Atualize, confira os saldos e tente novamente. Se houve falha de conexão com resultado incerto, mantenha o formulário e repita o mesmo envio: a chave de operação evita uma duplicação. Ao fechar ou trocar o formulário, confira primeiro o histórico.

## Backup

Uma cópia dos saldos e cadastros é criada antes da primeira operação de cada dia, e outra antes de uma restauração. Exporte também uma cópia para armazenamento externo com acesso controlado.

Para restaurar, escolha o JSON em **Equipe & backups** e digite RESTAURAR. O sistema valida o arquivo, preserva a equipe e o histórico de auditoria e registra a recuperação. A restauração substitui o saldo atual; faça-a quando a equipe estiver sem novos lançamentos.

Os snapshots da aplicação ficam no mesmo banco. Para recuperação de perda total da base ou da hospedagem, mantenha também a exportação completa do D1 e as configurações da plataforma, conforme o guia de implantação.

## Conferência de custos

O custo exibido na ficha é estimado pelo cadastro. A venda registra o custo real dos lotes consumidos. A curva ABC inicial usa consumo previsto × custo; ela não representa vendas realizadas. Totais de vendas refletem somente lançamentos deste programa e estornos, não o fechamento fiscal ou o lucro da loja.
