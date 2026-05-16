from django.db import models

class Usuario(models.Model):
    nome = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    senha = models.CharField(max_length=255)
    data_cadastro = models.DateField(auto_now_add=True)

    def ExibirPerfil(self):
        return f"{self.nome} — {self.email}"

    def AlterarSenha(self, nova_senha):
        self.senha = nova_senha
        self.save()

    def DeletarConta(self):
        self.delete()

    def __str__(self):
        return self.nome

    class Meta:
        verbose_name = "Usuário"
        verbose_name_plural = "Usuários"


class ListaTarefas(models.Model):

    STATUS_CHOICES = [
        ('Pendente',     'Pendente'),
        ('Em andamento', 'Em andamento'),
        ('Concluído',    'Concluído'),
        ('Atrasada',     'Atrasada'),
    ]

    usuario   = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='tarefas')
    titulo    = models.CharField(max_length=200)
    descricao = models.TextField(blank=True)
    data      = models.DateField()
    status    = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pendente')

    def MostrarTarefa(self):
        return f"[{self.status}] {self.titulo} — {self.data}"

    def ConcluirTarefa(self):
        self.status = 'Concluído'
        self.save()

    def AlertaTarefa(self):
        from datetime import date
        return self.data < date.today() and self.status not in ('Concluído',)

    def EditarTarefa(self, titulo=None, descricao=None, data=None, status=None):
        if titulo:    self.titulo    = titulo
        if descricao: self.descricao = descricao
        if data:      self.data      = data
        if status:    self.status    = status
        self.save()

    def __str__(self):
        return self.titulo

    class Meta:
        verbose_name = "Tarefa"
        verbose_name_plural = "Tarefas"
        ordering = ['data']