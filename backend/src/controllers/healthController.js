const getHealth = (req, res) => {
  res.status(200).json({
    ok: true,
    message: 'API funcionando correctamente'
  });
};

module.exports = {
  getHealth
};