"""Rebuild tasks_task so id is UUID, matching the model.

Local schema drift: 0001_initial was rewritten to UUIDField after the table
had already been created with a bigint PK. django_migrations marked 0001 as
applied, so migrate was a no-op while PostgreSQL still had bigint id - causing
ProgrammingError on insert. Safe to drop/recreate: local/dev data only.
"""

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RunSQL(
            sql='DROP TABLE IF EXISTS tasks_task CASCADE;',
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.SeparateDatabaseAndState(
            # Project state already describes Task with a UUID PK from 0001.
            state_operations=[],
            database_operations=[
                migrations.CreateModel(
                    name='Task',
                    fields=[
                        (
                            'id',
                            models.UUIDField(
                                default=uuid.uuid4,
                                editable=False,
                                primary_key=True,
                                serialize=False,
                            ),
                        ),
                        ('title', models.CharField(max_length=255)),
                        ('description', models.TextField(blank=True)),
                        (
                            'due_date',
                            models.DateField(blank=True, null=True),
                        ),
                        (
                            'priority',
                            models.CharField(
                                choices=[
                                    ('low', 'Low'),
                                    ('medium', 'Medium'),
                                    ('high', 'High'),
                                ],
                                default='medium',
                                max_length=10,
                            ),
                        ),
                        (
                            'category',
                            models.CharField(blank=True, max_length=100),
                        ),
                        ('completed', models.BooleanField(default=False)),
                        (
                            'created_at',
                            models.DateTimeField(auto_now_add=True),
                        ),
                        (
                            'updated_at',
                            models.DateTimeField(auto_now=True),
                        ),
                        (
                            'user',
                            models.ForeignKey(
                                on_delete=django.db.models.deletion.CASCADE,
                                related_name='tasks',
                                to=settings.AUTH_USER_MODEL,
                            ),
                        ),
                    ],
                    options={
                        'ordering': ['-created_at'],
                    },
                ),
            ],
        ),
    ]
